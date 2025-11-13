import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { storageConfig, getFileUrl } from '../config/cloudStorage.js';

const generateFilename = (originalName) => {
  const ext = path.extname(originalName) || '.bin';
  const id = crypto.randomUUID();
  return `${id}${ext}`;
};

const buildSupabasePath = (filename) => {
  if (!storageConfig.supabaseUrl || !storageConfig.supabaseServiceKey) {
    throw new Error('Supabase storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  const folder = storageConfig.supabaseFolder?.replace(/\/*$/, '');
  return folder ? `${folder}/${filename}` : filename;
};

export const saveFile = async (file) => {
  if (storageConfig.type === 'supabase') {
    const filename = generateFilename(file.originalname);
    const key = buildSupabasePath(filename);
    const uploadUrl = `${storageConfig.supabaseUrl}/storage/v1/object/${storageConfig.supabaseBucket}/${key}`;
    const dataBuffer = file.buffer ?? await fs.readFile(file.path);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${storageConfig.supabaseServiceKey}`,
        'Content-Type': file.mimetype || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: dataBuffer,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(`Supabase upload failed: ${message}`);
    }

    if (file.path) {
      await fs.unlink(file.path).catch(() => {});
    }

    const publicUrl = `${storageConfig.supabaseUrl}/storage/v1/object/public/${storageConfig.supabaseBucket}/${key}`;

    return {
      filename,
      originalName: file.originalname,
      path: key,
      size: file.size ?? dataBuffer.length,
      mimetype: file.mimetype,
      url: publicUrl,
    };
  }

  return {
    filename: path.basename(file.path),
    originalName: file.originalname,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    url: getFileUrl(path.basename(file.path)),
  };
};

export const deleteFile = async (filePath) => {
  try {
    if (storageConfig.type === 'supabase') {
      const deleteUrl = `${storageConfig.supabaseUrl}/storage/v1/object/${storageConfig.supabaseBucket}/${filePath}`;
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${storageConfig.supabaseServiceKey}`,
        },
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(`Supabase delete failed: ${message}`);
      }

      return true;
    }

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
