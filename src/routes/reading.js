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

    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const calculatedTotalPages = totalPages || 100; // Default if not provided
    const percentageComplete = Math.min(100, Math.max(0, (currentPage / calculatedTotalPages) * 100));

    const progress = await prisma.readingProgress.upsert({
      where: {
        userId_bookId: {
          userId: req.user.id,
          bookId,
        },
      },
      update: {
        currentPage,
        totalPages: calculatedTotalPages,
        percentageComplete,
        lastReadAt: new Date(),
      },
      create: {
        userId: req.user.id,
        bookId,
        currentPage,
        totalPages: calculatedTotalPages,
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

