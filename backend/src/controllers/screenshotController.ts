import { Response } from 'express';
import { Screenshot } from '../models/Screenshot';
import { AuthRequest } from '../middleware/auth';
import { paginate } from '../utils/helpers';
import path from 'path';
import fs from 'fs';

export const uploadScreenshot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'No screenshot file provided.' });
      return;
    }

    const { activeApp, windowTitle, productivityTag } = req.body;

    const screenshot = await Screenshot.create({
      userId,
      tenantId,
      timestamp: new Date(),
      imageUrl: `/uploads/screenshots/${file.filename}`,
      thumbnailUrl: `/uploads/screenshots/${file.filename}`,
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
    res.status(500).json({ success: false, message: 'Upload failed.', error: (error as Error).message });
  }
};

export const listScreenshots = async (req: AuthRequest, res: Response): Promise<void> => {
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
    res.status(500).json({ success: false, message: 'Failed to list screenshots.', error: (error as Error).message });
  }
};

export const getScreenshot = async (req: AuthRequest, res: Response): Promise<void> => {
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
    res.status(500).json({ success: false, message: 'Failed to get screenshot.', error: (error as Error).message });
  }
};

export const deleteScreenshot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const screenshot = await Screenshot.findOneAndDelete({ _id: id, tenantId });
    if (!screenshot) {
      res.status(404).json({ success: false, message: 'Screenshot not found.' });
      return;
    }

    const filePath = path.resolve(screenshot.imageUrl.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: 'Screenshot deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete screenshot.', error: (error as Error).message });
  }
};
