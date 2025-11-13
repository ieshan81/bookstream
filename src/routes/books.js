import express from 'express';
import prisma from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';
import { searchBooks, getBooksByCategory, getRelatedBooks } from '../services/search.js';

const router = express.Router();

// Get all books with optional filters
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { q, genre, limit = 50, offset = 0 } = req.query;

    const result = await searchBooks(q, {
      genre,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get book by ID
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        uploader: {
          select: { id: true, name: true, avatar: true },
        },
        ...(req.user && {
          readingProgress: {
            where: { userId: req.user.id },
            select: {
              currentPage: true,
              totalPages: true,
              percentageComplete: true,
              lastReadAt: true,
            },
          },
        }),
      },
    });

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json(book);
  } catch (error) {
    next(error);
  }
});

// Get books by category
router.get('/categories/:category', optionalAuth, async (req, res, next) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;

    const books = await getBooksByCategory(category, parseInt(limit));

    res.json({ books, category });
  } catch (error) {
    next(error);
  }
});

// Get related books
router.get('/:id/related', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    const books = await getRelatedBooks(id, parseInt(limit));

    res.json({ books });
  } catch (error) {
    next(error);
  }
});

export default router;

