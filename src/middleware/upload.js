import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import os from 'os';
import { getStorageConfig } from '../config/cloudStorage.js';

const ensureLocalDirectory = (directory) => {
  try {
    fs.mkdirSync(directory, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

const buildDiskStorage = (storageConfig) => {
  ensureLocalDirectory(storageConfig.localPath);

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, storageConfig.localPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  });
};

const createMulterInstance = () => {
  const storageConfig = getStorageConfig();
  const allowedMimes = storageConfig.allowedFormats;
  const allowedExts = ['.pdf', '.epub'];
  const storage = storageConfig.type === 'supabase'
    ? multer.memoryStorage()
    : buildDiskStorage(storageConfig);

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and ePub files are allowed.'), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: storageConfig.maxFileSize,
    },
  });
};

export const uploadSingle = (req, res, next) => {
  const uploader = createMulterInstance().single('book');
  return uploader(req, res, next);
};

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
