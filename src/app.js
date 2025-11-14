import express from 'express';
import cors from 'cors';
import path from 'path';
import passport from 'passport';

import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';
import uploadRoutes from './routes/upload.js';
import readingRoutes from './routes/reading.js';
import { storageConfig } from './config/cloudStorage.js';

const app = express();

app.use(cors({
  origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

if (storageConfig.type === 'local') {
  const uploadsDir = path.resolve(storageConfig.localPath ?? './uploads');
  app.use('/api/files', express.static(uploadsDir));
}

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/books', uploadRoutes);
app.use('/api/reading', readingRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BookStream API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;
