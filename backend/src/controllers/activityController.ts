import { Response } from 'express';
import { ActivityLog } from '../models/ActivityLog';
import { AuthRequest } from '../middleware/auth';
import { paginate } from '../utils/helpers';

export const logActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const { activities } = req.body;

    if (!Array.isArray(activities) || activities.length === 0) {
      res.status(400).json({ success: false, message: 'Activities array required.' });
      return;
    }

    const docs = activities.map((a: Record<string, unknown>) => ({
      userId,
      tenantId,
      appName: a.appName || 'Unknown',
      windowTitle: a.windowTitle || '',
      url: a.url || '',
      startTime: a.startTime ? new Date(a.startTime as string) : new Date(),
      endTime: a.endTime ? new Date(a.endTime as string) : undefined,
      durationMinutes: Number(a.durationMinutes) || 0,
      category: a.category || 'neutral',
    }));

    const logs = await ActivityLog.insertMany(docs);
    res.status(201).json({ success: true, message: `${logs.length} activities logged.`, data: { count: logs.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to log activity.', error: (error as Error).message });
  }
};

export const getActivityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { page = 1, limit = 50, userId, startDate, endDate, category } = req.query;
    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const filter: Record<string, unknown> = { tenantId };

    if (req.user?.role === 'employee') {
      filter.userId = req.user._id;
    } else if (userId) {
      filter.userId = userId;
    }

    if (category) filter.category = category;

    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) (filter.startTime as Record<string, unknown>).$gte = new Date(startDate as string);
      if (endDate) (filter.startTime as Record<string, unknown>).$lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate('userId', 'name email employeeId')
        .skip(skip)
        .limit(lim)
        .sort({ startTime: -1 }),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get activities.', error: (error as Error).message });
  }
};

export const getActivitySummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { userId, startDate, endDate } = req.query;

    const matchFilter: Record<string, unknown> = { tenantId };
    if (req.user?.role === 'employee') {
      matchFilter.userId = req.user._id;
    } else if (userId) {
      matchFilter.userId = userId;
    }

    if (startDate || endDate) {
      matchFilter.startTime = {};
      if (startDate) (matchFilter.startTime as Record<string, unknown>).$gte = new Date(startDate as string);
      if (endDate) (matchFilter.startTime as Record<string, unknown>).$lte = new Date(endDate as string);
    }

    const summary = await ActivityLog.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$category',
          totalMinutes: { $sum: '$durationMinutes' },
          count: { $sum: 1 },
        },
      },
    ]);

    const topApps = await ActivityLog.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$appName',
          totalMinutes: { $sum: '$durationMinutes' },
          count: { $sum: 1 },
          category: { $first: '$category' },
        },
      },
      { $sort: { totalMinutes: -1 } },
      { $limit: 10 },
    ]);

    res.json({ success: true, data: { summary, topApps } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get summary.', error: (error as Error).message });
  }
};
