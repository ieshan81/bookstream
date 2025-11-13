import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { storageConfig } from '../config/cloudStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageConfig.localPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = storageConfig.allowedFormats;
  const allowedExts = ['.pdf', '.epub'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and ePub files are allowed.'), false);
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: storageConfig.maxFileSize,
  },
});

export const uploadSingle = upload.single('book');

