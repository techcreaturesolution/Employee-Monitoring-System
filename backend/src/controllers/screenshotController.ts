// FIXED VERSION: backend/src/controllers/screenshotController.ts
// Cloudinary upload with exponential-backoff retry + graceful local fallback

import { Response, NextFunction } from 'express';
import { Screenshot } from '../models/Screenshot';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { createNotification } from '../utils/notification';
import { paginate } from '../utils/helpers';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { uploadToCloudinary, getCloudinaryThumbnail, deleteFromCloudinary, isCloudinaryConfigured } from '../utils/cloudinary';

// ── Retry helper: exponential backoff ────────────────────────────────────────
const uploadWithRetry = async (
  filePath: string,
  folder: string,
  customFolder: string,
  maxRetries: number = 3
): Promise<{ secureUrl: string; publicId: string; bytes?: number } | null> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`[Attempt ${attempt}/${maxRetries}] Uploading to Cloudinary...`);
      const result = await uploadToCloudinary(filePath, folder, customFolder);
      return result as { secureUrl: string; publicId: string; bytes?: number } | null;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return null;
};

const uploadScreenshot = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const requestId = `req_${Date.now()}`;
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'No screenshot file provided.' });
      return;
    }

    if (!isCloudinaryConfigured) {
      logger.warn(`[${requestId}] ⚠️  Cloudinary not configured – using local storage fallback.`);
    }

    const { activeApp, windowTitle, productivityTag } = req.body;

    let imageUrl = `/uploads/screenshots/${file.filename}`;
    let thumbnailUrl = `/uploads/screenshots/${file.filename}`;
    let publicId = '';
    let uploadedToCloud = false;
    let cloudWarning: string | undefined;

    if (isCloudinaryConfigured) {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const emailOrId = req.user?.email || String(userId);
        const customFolder = `ems/screenshots/${emailOrId}/${year}/${month}`;

        logger.info(`[${requestId}] Uploading to Cloudinary folder: ${customFolder}`);
        const cloudinaryResult = await uploadWithRetry(file.path, 'screenshots', customFolder, 3);

        if (cloudinaryResult) {
          imageUrl = cloudinaryResult.secureUrl;
          thumbnailUrl = getCloudinaryThumbnail(cloudinaryResult.secureUrl);
          publicId = cloudinaryResult.publicId;
          uploadedToCloud = true;
          logger.info(`[${requestId}] ✅ Cloudinary upload successful: ${publicId}`);
        } else {
          cloudWarning = 'Cloudinary returned empty response – using local storage.';
          logger.error(`[${requestId}] ${cloudWarning}`);
        }
      } catch (uploadError) {
        const errMsg = uploadError instanceof Error ? uploadError.message : String(uploadError);
        cloudWarning = `Cloudinary upload failed after retries: ${errMsg}. Stored locally.`;
        logger.error(`[${requestId}] ❌ ${cloudWarning}`);
        // Keep local fallback url; do NOT delete the file
      }
    } else {
      logger.info(`[${requestId}] 📁 Local storage: ${file.filename}`);
    }

    // ── Save to database ───────────────────────────────────────────────────────
    const screenshot = await Screenshot.create({
      userId,
      tenantId,
      timestamp: new Date(),
      imageUrl,
      publicId,
      thumbnailUrl,
      activeApp: activeApp || '',
      windowTitle: windowTitle || '',
      productivityTag: productivityTag || 'neutral',
      metadata: {
        resolution: req.body.resolution || '',
        fileSize: file.size,
        format: path.extname(file.originalname).replace('.', '') || 'png',
        uploadedToCloud,
      },
    });

    logger.info(`[${requestId}] Screenshot saved to DB: ${screenshot._id}`);

    // Notify managers and admins
    if (tenantId) {
      User.find({ tenantId, role: { $in: ['manager', 'company_admin'] } })
        .then(managers => {
          for (const mgr of managers) {
            createNotification(req.app, {
              tenantId,
              userId: mgr._id as any,
              type: 'screenshot',
              title: 'New Screenshot',
              message: `${req.user?.name || 'Employee'} uploaded a new screenshot.`,
              link: '/screenshots',
            }).catch(err => logger.error('Failed to create screenshot notification:', err));
          }
        })
        .catch(err => logger.error('Failed to find managers for screenshot notification:', err));
    }

    res.status(201).json({
      success: true,
      message: `Screenshot uploaded${uploadedToCloud ? ' to Cloudinary' : ' locally'}.`,
      data: screenshot,
      ...(cloudWarning && { warning: cloudWarning }),
    });
  } catch (error) {
    logger.error('uploadScreenshot failed:', error);
    // ✅ FIX 6: Clean up file on any error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanup) {
        logger.error('Failed to cleanup temporary file:', cleanup);
      }
    }
    next(error);
  }
};

const listScreenshots = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { page = 1, limit = 20, userId, startDate, endDate, productivityTag } = req.query;
    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const filter: Record<string, unknown> = { tenantId };

    if (req.user?.role === 'employee') {
      filter.userId = req.user._id;
    } else if (userId) {
      filter.userId = userId;
    }

    if (productivityTag) filter.productivityTag = productivityTag;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) (filter.timestamp as Record<string, unknown>).$gte = new Date(startDate as string);
      if (endDate) (filter.timestamp as Record<string, unknown>).$lte = new Date(endDate as string);
    }

    const [screenshots, total] = await Promise.all([
      Screenshot.find(filter)
        .populate('userId', 'name email employeeId')
        .skip(skip)
        .limit(lim)
        .sort({ timestamp: -1 }),
      Screenshot.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        screenshots,
        pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
      },
    });
  } catch (error) {
    logger.error('listScreenshots failed:', error);
    next(error);
  }
};

const getScreenshot = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const screenshot = await Screenshot.findOne({ _id: id, tenantId })
      .populate('userId', 'name email employeeId');

    if (!screenshot) {
      res.status(404).json({ success: false, message: 'Screenshot not found.' });
      return;
    }

    res.json({ success: true, data: screenshot });
  } catch (error) {
    logger.error('getScreenshot failed:', error);
    next(error);
  }
};

const deleteScreenshot = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const screenshot = await Screenshot.findOneAndDelete({ _id: id, tenantId });
    if (!screenshot) {
      res.status(404).json({ success: false, message: 'Screenshot not found.' });
      return;
    }

    // Delete from Cloudinary if publicId exists
    if (screenshot.publicId) {
      const deleted = await deleteFromCloudinary(screenshot.publicId);
      if (deleted) {
        logger.info(`✅ Deleted from Cloudinary: ${screenshot.publicId}`);
      } else {
        logger.warn(`⚠️  Failed to delete from Cloudinary: ${screenshot.publicId}`);
      }
    }

    // ✅ FIX 7: Only delete local file if it's not from Cloudinary
    if (!screenshot.publicId) {
      const UPLOAD_DIR = path.resolve(config.upload.dir, 'screenshots');
      const filePath = path.resolve(UPLOAD_DIR, path.basename(screenshot.imageUrl));

      // Guard: ensure resolved path is within upload directory
      if (filePath.startsWith(UPLOAD_DIR + path.sep)) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`Deleted local file: ${filePath}`);
        }
      }
    }

    res.json({ success: true, message: 'Screenshot deleted.' });
  } catch (error) {
    logger.error('deleteScreenshot failed:', error);
    next(error);
  }
};

export {
  uploadScreenshot,
  listScreenshots,
  getScreenshot,
  deleteScreenshot,
};
