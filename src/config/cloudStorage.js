const joinKey = (segments) => segments.join('_');

const readEnv = (segments, fallback) => {
  const key = Array.isArray(segments) ? joinKey(segments) : segments;
  const value = process.env?.[key];
  return value ?? fallback;
};

export const getStorageConfig = () => {
  const type = readEnv(['STORAGE', 'TYPE'], 'local');

  return {
    type,
    localPath: readEnv(['UPLOAD', 'DIR'], './uploads'),
    maxFileSize: Number.parseInt(readEnv(['MAX', 'FILE', 'SIZE'], ''), 10) || 52428800,
    allowedFormats: ['application/pdf', 'application/epub+zip', 'application/epub'],
    supabaseUrl: readEnv(['SUPABASE', 'URL']),
    supabaseServiceKey: readEnv(['SUPABASE', 'SERVICE', 'ROLE', 'KEY']),
    supabaseBucket: readEnv(['SUPABASE', 'BUCKET'], 'book-files'),
    supabaseFolder: readEnv(['SUPABASE', 'FOLDER'], 'uploads'),
  };
};

export const getFileUrl = (filename, config = getStorageConfig()) => {
  if (config.type === 'local') {
    return `/api/files/${filename}`;
  }

  return filename;
};
