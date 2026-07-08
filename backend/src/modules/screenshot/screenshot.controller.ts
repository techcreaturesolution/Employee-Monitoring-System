import { Response } from 'express';
import { Screenshot } from './screenshot.model';
import { AuthRequest } from '../../middleware/auth';
import { User } from '../employee/employee.model';
import { createNotification } from '../../utils/notification';
import { paginate } from '../../utils/helpers';
import path from 'path';
import fs from 'fs';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { uploadToCloudinary, getCloudinaryThumbnail, deleteFromCloudinary, isCloudinaryConfigured } from '../../utils/cloudinary';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

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

export const uploadScreenshot = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = `req_${Date.now()}`;
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;
  const file = req.file;

  if (!file) {
    throw new ApiError(400, 'No screenshot file provided.');
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
    }
  } else {
    logger.info(`[${requestId}] 📁 Local storage: ${file.filename}`);
  }

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
            tenantId: tenantId!,
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

  res.status(201).json(
    new ApiResponse(201, `Screenshot uploaded${uploadedToCloud ? ' to Cloudinary' : ' locally'}.`, {
      screenshot,
      ...(cloudWarning && { warning: cloudWarning }),
    })
  );
});

export const listScreenshots = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

  res.json(
    new ApiResponse(200, 'Screenshots list retrieved.', {
      screenshots,
      pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
    })
  );
});

export const getScreenshot = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;

  const screenshot = await Screenshot.findOne({ _id: id, tenantId })
    .populate('userId', 'name email employeeId');

  if (!screenshot) {
    throw new ApiError(404, 'Screenshot not found.');
  }

  res.json(new ApiResponse(200, 'Screenshot details fetched.', screenshot));
});

export const deleteScreenshot = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;

  const screenshot = await Screenshot.findOneAndDelete({ _id: id, tenantId });
  if (!screenshot) {
    throw new ApiError(404, 'Screenshot not found.');
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

  // Only delete local file if it's not from Cloudinary
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

  res.json(new ApiResponse(200, 'Screenshot deleted successfully.'));
});

export const getScreenshotTimeline = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const { userId, date } = req.query as Record<string, string>;

  const targetDate = date ? new Date(date) : new Date();
  const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
  const end   = new Date(targetDate); end.setHours(23, 59, 59, 999);

  const filter: Record<string, unknown> = { tenantId, timestamp: { $gte: start, $lte: end } };
  if (req.user?.role === 'employee') {
    filter.userId = req.user._id;
  } else if (userId) {
    filter.userId = userId;
  }

  const screenshots = await Screenshot.find(filter)
    .populate('userId', 'name email avatar employeeId')
    .sort({ timestamp: 1 });

  // Group by hour
  const byHour: Record<string, typeof screenshots> = {};
  for (const s of screenshots) {
    const hour = new Date(s.timestamp).getHours();
    const key = `${String(hour).padStart(2, '0')}:00`;
    if (!byHour[key]) byHour[key] = [];
    byHour[key].push(s);
  }

  res.json(
    new ApiResponse(200, 'Screenshot timeline fetched.', {
      date: targetDate.toISOString().split('T')[0],
      total: screenshots.length,
      timeline: byHour,
    })
  );
});

export const getScreenshotGrid = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const { page = 1, limit = 24, userId, date, startDate, endDate, tag } = req.query as Record<string, string>;
  const { skip, limit: lim } = paginate(Number(page), Number(limit));

  const filter: Record<string, unknown> = { tenantId };

  if (req.user?.role === 'employee') {
    filter.userId = req.user._id;
  } else if (userId) {
    filter.userId = userId;
  }

  if (tag) filter.productivityTag = tag;

  if (date) {
    const d = new Date(date);
    const s = new Date(d); s.setHours(0, 0, 0, 0);
    const e = new Date(d); e.setHours(23, 59, 59, 999);
    filter.timestamp = { $gte: s, $lte: e };
  } else if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) (filter.timestamp as any).$gte = new Date(startDate);
    if (endDate)   (filter.timestamp as any).$lte = new Date(endDate);
  }

  const [screenshots, total] = await Promise.all([
    Screenshot.find(filter)
      .populate('userId', 'name email avatar')
      .skip(skip)
      .limit(lim)
      .sort({ timestamp: -1 }),
    Screenshot.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, 'Screenshot grid fetched.', {
      screenshots,
      pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
    })
  );
});

export const downloadScreenshot = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.query as Record<string, string>;
  const tenantId = req.user?.tenantId;

  if (!id) {
    throw new ApiError(400, 'Screenshot id is required.');
  }

  const screenshot = await Screenshot.findOne({ _id: id, tenantId });
  if (!screenshot) {
    throw new ApiError(404, 'Screenshot not found.');
  }

  res.json(
    new ApiResponse(200, 'Screenshot download URL fetched.', {
      downloadUrl: screenshot.imageUrl,
      thumbnailUrl: screenshot.thumbnailUrl,
      filename: `screenshot_${screenshot.userId}_${new Date(screenshot.timestamp).toISOString().replace(/:/g, '-')}.png`,
    })
  );
});

export const getScreenshotFilters = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;

  const [employees, dateRange] = await Promise.all([
    // All employees who have screenshots
    Screenshot.distinct('userId', { tenantId }).then(async (ids) => {
      return User.find({ _id: { $in: ids } }, 'name email employeeId department');
    }),

    // Oldest and newest screenshot dates
    Promise.all([
      Screenshot.findOne({ tenantId }).sort({ timestamp: 1 }).select('timestamp'),
      Screenshot.findOne({ tenantId }).sort({ timestamp: -1 }).select('timestamp'),
    ]),
  ]);

  res.json(
    new ApiResponse(200, 'Screenshot filters options fetched.', {
      employees,
      productivityTags: ['productive', 'neutral', 'unproductive'],
      dateRange: {
        earliest: dateRange[0]?.timestamp || null,
        latest:   dateRange[1]?.timestamp || null,
      },
    })
  );
});
