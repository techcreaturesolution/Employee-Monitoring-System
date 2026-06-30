import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// Ensure upload directories exist
const screenshotDir = './uploads/screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// ============ STORAGE CONFIG ============
const storage = multer.memoryStorage();

// ============ FILE FILTER ============
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: any
) => {
  // Allowed MIME types
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(
      new Error(
        `Invalid file type. Only JPEG, PNG, and WebP are allowed. Got: ${file.mimetype}`
      )
    );
  }

  // File size limit (10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return cb(
      new Error(`File too large. Maximum size: 10MB. Got: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
    );
  }

  // Validate filename doesn't contain path traversal
  const filename = path.basename(file.originalname);
  if (filename !== file.originalname) {
    return cb(new Error('Invalid filename'));
  }

  cb(null, true);
};

// ============ UPLOAD MIDDLEWARE ============
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1, // Only 1 file per request
  },
});

// ============ ERROR HANDLER ============
export const handleUploadError = (
  error: any,
  req: any,
  res: any,
  next: any
) => {
  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum: 10MB',
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Only 1 file allowed per request',
      });
    }
  }

  if (error instanceof Error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
};

// ============ IMAGE COMPRESSION ============
export const compressScreenshot = async (
  req: any,
  res: any,
  next: any
) => {
  if (!req.file) return next();

  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `screenshot-${uniqueSuffix}.jpg`;
    const filepath = path.join(screenshotDir, filename);

    // Validate magic bytes
    // @ts-ignore
    const fileType = await import('file-type');
    const detected = await fileType.fileTypeFromBuffer(req.file.buffer);
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!detected || !allowed.includes(detected.mime)) {
      return res.status(400).json({ success: false, message: 'Invalid file content. Real type mismatch.' });
    }

    // Compress image from buffer
    const compressedBuffer = await sharp(req.file.buffer)
      .resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();

    // Replace original
    fs.writeFileSync(filepath, compressedBuffer);
    
    // Update req.file so subsequent controllers have the right info
    req.file.filename = filename;
    req.file.path = filepath;
    req.file.destination = screenshotDir;
    
    next();
  } catch (error) {
    next(error);
  }
};
