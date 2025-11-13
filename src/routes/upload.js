import express from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import { saveFile } from '../services/fileStorage.js';
import { parseBookMetadata } from '../services/bookParser.js';

const router = express.Router();

// Upload book
router.post('/upload', authenticate, uploadSingle, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Parse book metadata
    const metadata = await parseBookMetadata(req.file.path, req.file.originalname);

    // Check for duplicates (case-insensitive title + author match)
    const existingBook = await prisma.book.findFirst({
      where: {
        title: { equals: metadata.title, mode: 'insensitive' },
        author: { equals: metadata.author, mode: 'insensitive' },
      },
    });

    if (existingBook) {
      // Delete uploaded file since it's a duplicate
      const fs = await import('fs/promises');
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(409).json({
        message: 'Book already exists',
        existingBook: {
          id: existingBook.id,
          title: existingBook.title,
          author: existingBook.author,
          coverImageUrl: existingBook.coverImageUrl,
        },
      });
    }

    // Save file info
    const fileInfo = await saveFile(req.file);

    // Create book record
    const book = await prisma.book.create({
      data: {
        title: metadata.title,
        author: metadata.author,
        genre: metadata.genre,
        summaryShort: metadata.summaryShort,
        summaryLong: metadata.summaryLong,
        coverImageUrl: metadata.coverImageUrl,
        fileUrl: fileInfo.url,
        fileFormat: req.file.mimetype || 'application/pdf',
        uploaderId: req.user.id,
        metadata: metadata.metadata,
      },
      include: {
        uploader: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    res.status(201).json({
      message: 'Book uploaded successfully',
      book,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

