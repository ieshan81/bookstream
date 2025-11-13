import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { storageConfig, getFileUrl } from '../config/cloudStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const saveFile = async (file) => {
  // File is already saved by multer middleware
  // This function can be extended for cloud storage
  return {
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    url: getFileUrl(file.filename),
  };
};

export const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

export const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

export const isPDF = (filename) => {
  return getFileExtension(filename) === '.pdf';
};

export const isEPUB = (filename) => {
  return getFileExtension(filename) === '.epub';
};

