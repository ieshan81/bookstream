// Cloud storage configuration
// Currently using local storage, but can be extended for S3/Google Cloud

export const storageConfig = {
  type: process.env.STORAGE_TYPE || 'local', // 'local' | 's3' | 'gcs'
  localPath: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB default
  allowedFormats: ['application/pdf', 'application/epub+zip', 'application/epub'],
};

// Future: Add S3/GCS configuration here
export const getFileUrl = (filename) => {
  if (storageConfig.type === 'local') {
    return `/api/files/${filename}`;
  }
  // Add S3/GCS URL generation here
  return filename;
};

