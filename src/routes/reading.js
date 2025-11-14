import express from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Save reading progress
router.post('/progress', authenticate, async (req, res, next) => {
  try {
    const { bookId, currentPage, totalPages } = req.body;

    if (!bookId || currentPage === undefined) {
      return res.status(400).json({ message: 'bookId and currentPage are required' });
    }

    const parsedCurrentPage = Number.parseInt(currentPage, 10);

    if (Number.isNaN(parsedCurrentPage) || parsedCurrentPage < 0) {
      return res.status(400).json({ message: 'currentPage must be a non-negative integer' });
    }

    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    let calculatedTotalPages;

    if (totalPages === undefined || totalPages === null || totalPages === '') {
      calculatedTotalPages = 100; // Default if not provided
    } else {
      const parsedTotalPages = Number.parseInt(totalPages, 10);

      if (Number.isNaN(parsedTotalPages) || parsedTotalPages <= 0) {
        return res.status(400).json({ message: 'totalPages must be a positive integer when provided' });
      }

      calculatedTotalPages = parsedTotalPages;
    }

    const safeTotalPages = calculatedTotalPages <= 0 ? 1 : calculatedTotalPages;
    const boundedCurrentPage = Math.min(parsedCurrentPage, safeTotalPages);
    const percentageComplete = Math.min(100, Math.max(0, (boundedCurrentPage / safeTotalPages) * 100));

    const progress = await prisma.readingProgress.upsert({
      where: {
        userId_bookId: {
          userId: req.user.id,
          bookId,
        },
      },
      update: {
        currentPage: boundedCurrentPage,
        totalPages: safeTotalPages,
        percentageComplete,
        lastReadAt: new Date(),
      },
      create: {
        userId: req.user.id,
        bookId,
        currentPage: boundedCurrentPage,
        totalPages: safeTotalPages,
        percentageComplete,
      },
    });

    res.json(progress);
  } catch (error) {
    next(error);
  }
});

// Get reading progress for a book
router.get('/progress/:bookId', authenticate, async (req, res, next) => {
  try {
    const { bookId } = req.params;

    const progress = await prisma.readingProgress.findUnique({
      where: {
        userId_bookId: {
          userId: req.user.id,
          bookId,
        },
      },
    });

    if (!progress) {
      return res.status(404).json({ message: 'No reading progress found' });
    }

    res.json(progress);
  } catch (error) {
    next(error);
  }
});

// Get all reading progress for user
router.get('/progress', authenticate, async (req, res, next) => {
  try {
    const progress = await prisma.readingProgress.findMany({
      where: { userId: req.user.id },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImageUrl: true,
          },
        },
      },
      orderBy: { lastReadAt: 'desc' },
    });

    res.json(progress);
  } catch (error) {
    next(error);
  }
});

export default router;

