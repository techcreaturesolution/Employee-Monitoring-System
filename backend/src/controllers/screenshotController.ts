import { Response, NextFunction } from 'express';
import { Screenshot } from '../models/Screenshot';
import { AuthRequest } from '../middleware/auth';
import { paginate } from '../utils/helpers';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { uploadToCloudinary, getCloudinaryThumbnail } from '../utils/cloudinary';

const uploadScreenshot = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'No screenshot file provided.' });
      return;
    }

    const { activeApp, windowTitle, productivityTag } = req.body;

    let imageUrl = `/uploads/screenshots/${file.filename}`;
    let thumbnailUrl = `/uploads/screenshots/${file.filename}`;

    try {
      const cloudinaryResult = await uploadToCloudinary(file.path, 'screenshots');
      if (cloudinaryResult) {
        imageUrl = cloudinaryResult.secureUrl;
        thumbnailUrl = getCloudinaryThumbnail(cloudinaryResult.secureUrl);
      }
    } catch (uploadError) {
      logger.error('Failed to upload screenshot to Cloudinary, using local fallback:', uploadError);
    }

    const screenshot = await Screenshot.create({
      userId,
      tenantId,
      timestamp: new Date(),
      imageUrl,
      thumbnailUrl,
      activeApp: activeApp || '',
      windowTitle: windowTitle || '',
      productivityTag: productivityTag || 'neutral',
      metadata: {
        resolution: '',
        fileSize: file.size,
        format: path.extname(file.originalname).replace('.', ''),
      },
    });

    res.status(201).json({ success: true, message: 'Screenshot uploaded.', data: screenshot });
  } catch (error) {
    logger.error('uploadScreenshot failed:', error);
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

    const UPLOAD_DIR = path.resolve(config.upload.dir, 'screenshots');
    const filePath = path.resolve(UPLOAD_DIR, path.basename(screenshot.imageUrl));

    // Guard: ensure resolved path is within upload directory
    if (!filePath.startsWith(UPLOAD_DIR + path.sep)) {
      res.status(400).json({ success: false, message: 'Invalid file path.' });
      return;
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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
