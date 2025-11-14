export const storageConfig = {
  type: process.env.STORAGE_TYPE || 'local',
  localPath: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: Number.parseInt(process.env.MAX_FILE_SIZE, 10) || 52428800,
  allowedFormats: ['application/pdf', 'application/epub+zip', 'application/epub'],
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseBucket: process.env.SUPABASE_BUCKET || 'book-files',
  supabaseFolder: process.env.SUPABASE_FOLDER || 'uploads',
};

export const getFileUrl = (filename) => {
  if (storageConfig.type === 'local') {
    return `/api/files/${filename}`;
  }

  return filename;
};
