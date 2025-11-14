import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import os from 'os';
import { storageConfig } from '../config/cloudStorage.js';

const isSupabaseStorage = storageConfig.type === 'supabase';

if (!isSupabaseStorage) {
  try {
    fs.mkdirSync(storageConfig.localPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageConfig.localPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const storage = isSupabaseStorage
  ? multer.memoryStorage()
  : diskStorage;

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

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: storageConfig.maxFileSize,
  },
});

export const uploadSingle = upload.single('book');

export const createTempFileFromBuffer = async (file) => {
  const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'bookstream-'));
  const extension = path.extname(file.originalname) || '.tmp';
  const tempPath = path.join(tempDir, `${file.fieldname || 'upload'}${extension}`);
  await fsPromises.writeFile(tempPath, file.buffer);
  const cleanup = async () => {
    await fsPromises.unlink(tempPath).catch(() => {});
    await fsPromises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  };

  return { tempPath, cleanup };
};
