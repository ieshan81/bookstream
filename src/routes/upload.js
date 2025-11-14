import express from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { uploadSingle, createTempFileFromBuffer } from '../middleware/upload.js';
import { saveFile } from '../services/fileStorage.js';
import { parseBookMetadata } from '../services/bookParser.js';

const router = express.Router();

router.post('/upload', authenticate, uploadSingle, async (req, res, next) => {
  let cleanupTemp = async () => {};

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let workingPath = req.file.path;

    if (!workingPath && req.file.buffer) {
      const tempFile = await createTempFileFromBuffer(req.file);
      workingPath = tempFile.tempPath;
      cleanupTemp = tempFile.cleanup;
    }

    if (!workingPath) {
      return res.status(500).json({ message: 'Unable to process uploaded file' });
    }

    const metadata = await parseBookMetadata(workingPath, req.file.originalname);

    const existingBook = await prisma.book.findFirst({
      where: {
        title: { equals: metadata.title, mode: 'insensitive' },
        author: { equals: metadata.author, mode: 'insensitive' },
      },
    });

    if (existingBook) {
      if (req.file.path) {
        const fs = await import('fs/promises');
        await fs.unlink(req.file.path).catch(() => {});
      }
      await cleanupTemp();

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

    const fileInfo = await saveFile({ ...req.file, path: req.file.path || workingPath });

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

    await cleanupTemp();

    res.status(201).json({
      message: 'Book uploaded successfully',
      book,
    });
  } catch (error) {
    await cleanupTemp();
    next(error);
  }
});

export default router;
