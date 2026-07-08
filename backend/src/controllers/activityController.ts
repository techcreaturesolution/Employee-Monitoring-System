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

    // Filter out activities that already exist in the database (matching userId and startTime)
    const startTimes = docs.map(d => d.startTime);
    const existingLogs = await ActivityLog.find({
      userId,
      startTime: { $in: startTimes }
    }, 'startTime');

    const existingTimes = new Set(existingLogs.map(e => e.startTime.getTime()));
    const uniqueDocs = docs.filter(d => !existingTimes.has(d.startTime.getTime()));

    if (uniqueDocs.length > 0) {
      const logs = await ActivityLog.insertMany(uniqueDocs);
      res.status(201).json({ success: true, message: `${logs.length} activities logged.`, data: { count: logs.length } });
    } else {
      res.status(200).json({ success: true, message: 'No new activities to log.', data: { count: 0 } });
    }
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

// ─────────────────────────────────────────────────────────────────────────────
// Shared helper: build a base filter for activity queries
// ─────────────────────────────────────────────────────────────────────────────
const buildActivityFilter = (req: AuthRequest) => {
  const tenantId = req.user?.tenantId;
  const { userId, startDate, endDate } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = { tenantId };

  if (req.user?.role === 'employee') {
    filter.userId = req.user._id;
  } else if (userId) {
    filter.userId = userId;
  }

  if (startDate || endDate) {
    filter.startTime = {} as Record<string, unknown>;
    if (startDate) (filter.startTime as Record<string, unknown>).$gte = new Date(startDate);
    if (endDate)   (filter.startTime as Record<string, unknown>).$lte = new Date(endDate);
  }

  return filter;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/activity/keyboard
// Returns keyboard-related activity (apps with 'keyboard' in windowTitle/appName)
// ─────────────────────────────────────────────────────────────────────────────
export const getKeyboardActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = buildActivityFilter(req);
    // Keyboard tracking comes from agent data — filter by productive/neutral app usage
    const data = await ActivityLog.find({ ...filter, durationMinutes: { $gt: 0 } })
      .select('appName windowTitle durationMinutes startTime category userId')
      .populate('userId', 'name email employeeId')
      .sort({ startTime: -1 })
      .limit(200);

    const total = data.reduce((sum, d) => sum + (d.durationMinutes || 0), 0);
    res.json({ success: true, data: { logs: data, totalMinutes: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get keyboard activity.', error: (error as Error).message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/activity/mouse
// Mouse activity summary (idle vs active time computed from durationMinutes)
// ─────────────────────────────────────────────────────────────────────────────
export const getMouseActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = buildActivityFilter(req);
    const summary = await ActivityLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { userId: '$userId', category: '$category' },
          totalMinutes: { $sum: '$durationMinutes' },
          sessionCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.userId',
          activeMinutes: { $sum: { $cond: [{ $ne: ['$_id.category', 'neutral'] }, '$totalMinutes', 0] } },
          idleMinutes:   { $sum: { $cond: [{ $eq: ['$_id.category', 'neutral'] }, '$totalMinutes', 0] } },
          sessionCount:  { $sum: '$sessionCount' },
        },
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$user.name', email: '$user.email', activeMinutes: 1, idleMinutes: 1, sessionCount: 1 } },
    ]);

    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get mouse activity.', error: (error as Error).message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/activity/idle
// Idle time periods — logs with very short/no activity or neutral category
// ─────────────────────────────────────────────────────────────────────────────
export const getIdleActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = buildActivityFilter(req);
    const { date } = req.query as Record<string, string>;

    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end   = new Date(date); end.setHours(23, 59, 59, 999);
      (filter.startTime as Record<string, unknown>) = { $gte: start, $lte: end };
    }

    // Gaps between consecutive logs indicate idle periods
    const logs = await ActivityLog.find({ ...filter, category: 'neutral' })
      .select('appName windowTitle durationMinutes startTime endTime userId')
      .populate('userId', 'name email')
      .sort({ startTime: 1 });

    const totalIdleMinutes = logs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

    res.json({ success: true, data: { idleLogs: logs, totalIdleMinutes } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get idle activity.', error: (error as Error).message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/activity/timeline
// Ordered chronological activity stream for a specific day
// ─────────────────────────────────────────────────────────────────────────────
export const getActivityTimeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = buildActivityFilter(req);
    const { date } = req.query as Record<string, string>;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(targetDate); end.setHours(23, 59, 59, 999);

    filter.startTime = { $gte: start, $lte: end };

    const timeline = await ActivityLog.find(filter)
      .select('appName windowTitle url durationMinutes startTime endTime category userId')
      .populate('userId', 'name email avatar employeeId')
      .sort({ startTime: 1 });

    res.json({ success: true, data: { date: targetDate.toISOString().split('T')[0], timeline } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get timeline.', error: (error as Error).message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/activity/productivity
// Productivity score per user based on category breakdown
// ─────────────────────────────────────────────────────────────────────────────
export const getActivityProductivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = buildActivityFilter(req);

    const breakdown = await ActivityLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { userId: '$userId', category: '$category' },
          totalMinutes: { $sum: '$durationMinutes' },
        },
      },
      {
        $group: {
          _id: '$_id.userId',
          productive:   { $sum: { $cond: [{ $eq: ['$_id.category', 'productive']   }, '$totalMinutes', 0] } },
          neutral:      { $sum: { $cond: [{ $eq: ['$_id.category', 'neutral']      }, '$totalMinutes', 0] } },
          unproductive: { $sum: { $cond: [{ $eq: ['$_id.category', 'unproductive'] }, '$totalMinutes', 0] } },
        },
      },
      {
        $addFields: {
          total: { $add: ['$productive', '$neutral', '$unproductive'] },
          score: {
            $cond: [
              { $gt: [{ $add: ['$productive', '$neutral', '$unproductive'] }, 0] },
              { $multiply: [{ $divide: ['$productive', { $add: ['$productive', '$neutral', '$unproductive'] }] }, 100] },
              0,
            ],
          },
        },
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: '$user.name', email: '$user.email', department: '$user.department',
          productive: 1, neutral: 1, unproductive: 1, total: 1,
          score: { $round: ['$score', 1] },
        },
      },
      { $sort: { score: -1 } },
    ]);

    res.json({ success: true, data: breakdown });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get productivity.', error: (error as Error).message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/activity/apps
// Top app usage aggregated per user
// ─────────────────────────────────────────────────────────────────────────────
export const getAppUsage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = buildActivityFilter(req);
    const { limit = 20 } = req.query as Record<string, string>;

    const apps = await ActivityLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { appName: '$appName', category: '$category' },
          totalMinutes: { $sum: '$durationMinutes' },
          sessionCount: { $sum: 1 },
          users: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          appName: '$_id.appName',
          category: '$_id.category',
          totalMinutes: 1,
          sessionCount: 1,
          userCount: { $size: '$users' },
        },
      },
      { $sort: { totalMinutes: -1 } },
      { $limit: Number(limit) },
    ]);

    res.json({ success: true, data: apps });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get app usage.', error: (error as Error).message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/activity/websites
// Top website/URL usage
// ─────────────────────────────────────────────────────────────────────────────
export const getWebsiteUsage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = buildActivityFilter(req);
    const { limit = 20 } = req.query as Record<string, string>;

    const websites = await ActivityLog.aggregate([
      { $match: { ...filter, url: { $ne: '', $exists: true } } },
      {
        $group: {
          _id: { url: '$url', category: '$category' },
          totalMinutes: { $sum: '$durationMinutes' },
          visitCount: { $sum: 1 },
          users: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          url: '$_id.url',
          category: '$_id.category',
          totalMinutes: 1,
          visitCount: 1,
          userCount: { $size: '$users' },
        },
      },
      { $sort: { totalMinutes: -1 } },
      { $limit: Number(limit) },
    ]);

    res.json({ success: true, data: websites });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get website usage.', error: (error as Error).message });
  }
};

