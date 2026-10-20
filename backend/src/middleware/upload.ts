import multer from 'multer';

// Use memory storage so we can stream/upload buffer directly to S3 or write locally
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max limit
  },
  fileFilter: (_req, file, cb) => {
    // Basic file extension/mime check
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.zip', '.txt', '.csv', '.xlsx', '.png', '.jpg', '.jpeg'];
    const fileNameLower = file.originalname.toLowerCase();
    const hasValidExt = allowedExtensions.some(ext => fileNameLower.endsWith(ext));

    if (hasValidExt) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Permitted extensions: ${allowedExtensions.join(', ')}`));
    }
  },
});
