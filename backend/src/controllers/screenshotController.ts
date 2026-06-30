// FIXED VERSION: backend/src/controllers/screenshotController.ts
// This version properly handles Cloudinary upload failures and validates configuration

import { Response, NextFunction } from 'express';
import { Screenshot } from '../models/Screenshot';
import { AuthRequest } from '../middleware/auth';
import { paginate } from '../utils/helpers';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { uploadToCloudinary, getCloudinaryThumbnail, deleteFromCloudinary, isCloudinaryConfigured } from '../utils/cloudinary';

const uploadScreenshot = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'No screenshot file provided.' });
      return;
    }

    // ✅ FIX 1: Validate Cloudinary configuration at request time
    if (!isCloudinaryConfigured) {
      logger.warn('⚠️  Cloudinary is not configured. Ensure these env vars are set:');
      logger.warn('   - CLOUDINARY_CLOUD_NAME');
      logger.warn('   - CLOUDINARY_API_KEY');
      logger.warn('   - CLOUDINARY_API_SECRET');
      
      // Decide: Fail the request or allow local fallback
      // Currently allowing fallback (if you prefer, reject with 503)
      // res.status(503).json({ success: false, message: 'Cloud storage service not configured.' });
      // return;
    }

    const { activeApp, windowTitle, productivityTag } = req.body;

    let imageUrl = `/uploads/screenshots/${file.filename}`;
    let thumbnailUrl = `/uploads/screenshots/${file.filename}`;
    let publicId = '';
    let uploadedToCloud = false;

    // ✅ FIX 2: Explicit Cloudinary upload with proper error handling
    if (isCloudinaryConfigured) {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const emailOrId = req.user?.email || String(userId);
        const customFolder = `ems/screenshots/${emailOrId}/${year}/${month}`;

        const cloudinaryResult = await uploadToCloudinary(file.path, 'screenshots', customFolder);
        
        if (cloudinaryResult) {
          imageUrl = cloudinaryResult.secureUrl;
          thumbnailUrl = getCloudinaryThumbnail(cloudinaryResult.secureUrl);
          publicId = cloudinaryResult.publicId;
          uploadedToCloud = true;
          logger.info(`✅ Screenshot uploaded to Cloudinary: ${publicId}`);
        } else {
          logger.error('⚠️  Cloudinary returned null. Check credentials.');
        }
      } catch (uploadError) {
        logger.error('❌ Failed to upload screenshot to Cloudinary:', uploadError);
        // ✅ FIX 3: Clean up local file if Cloudinary fails
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          logger.info(`Cleaned up temporary file: ${file.path}`);
        }
        // Don't fall back to local storage if Cloudinary is configured but fails
        // This is more explicit about storage issues
        res.status(503).json({ 
          success: false, 
          message: 'Cloud storage upload failed. Please try again.' 
        });
        return;
      }
    } else {
      // ✅ FIX 4: Log when falling back to local storage (no Cloudinary configured)
      logger.info(`📁 Using local storage for screenshot (Cloudinary not configured): ${file.filename}`);
    }

    // ✅ FIX 5: Record whether screenshot is in cloud or local
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
        resolution: '',
        fileSize: file.size,
        format: path.extname(file.originalname).replace('.', ''),
        uploadedToCloud,  // Track where it's stored
      },
    });

    res.status(201).json({ 
      success: true, 
      message: `Screenshot uploaded${uploadedToCloud ? ' to Cloudinary' : ' locally'}.`, 
      data: screenshot 
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
