import { Response } from 'express';
import { ActivityLog } from './activity.model';
import { AuthRequest } from '../../middleware/auth';
import { paginate } from '../../utils/helpers';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { User } from '../employee/employee.model';

export const logActivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;
  const { activities } = req.body;

  if (!Array.isArray(activities) || activities.length === 0) {
    throw new ApiError(400, 'Activities array required.');
  }

  const docs = activities.map((a: Record<string, any>) => ({
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

  // Filter out activities that already exist (matching userId and startTime)
  const startTimes = docs.map(d => d.startTime);
  const existingLogs = await ActivityLog.find({
    userId,
    startTime: { $in: startTimes }
  }, 'startTime');

  const existingTimes = new Set(existingLogs.map(e => e.startTime.getTime()));
  const uniqueDocs = docs.filter(d => !existingTimes.has(d.startTime.getTime()));

  if (uniqueDocs.length > 0) {
    const logs = await ActivityLog.insertMany(uniqueDocs);
    res.status(201).json(new ApiResponse(201, `${logs.length} activities logged.`, { count: logs.length }));
  } else {
    res.json(new ApiResponse(200, 'No new activities to log.', { count: 0 }));
  }
});

export const getActivityLogs = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

  res.json(
    new ApiResponse(200, 'Activities list retrieved.', {
      logs,
      pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
    })
  );
});

export const getActivitySummary = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

  const [summary, topApps] = await Promise.all([
    ActivityLog.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$category',
          totalMinutes: { $sum: '$durationMinutes' },
          count: { $sum: 1 },
        },
      },
    ]),
    ActivityLog.aggregate([
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
    ]),
  ]);

  res.json(new ApiResponse(200, 'Activity summary fetched.', { summary, topApps }));
});

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

export const getKeyboardActivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const filter = buildActivityFilter(req);
  const data = await ActivityLog.find({ ...filter, durationMinutes: { $gt: 0 } })
    .select('appName windowTitle durationMinutes startTime category userId')
    .populate('userId', 'name email employeeId')
    .sort({ startTime: -1 })
    .limit(200);

  const total = data.reduce((sum, d) => sum + (d.durationMinutes || 0), 0);
  res.json(new ApiResponse(200, 'Keyboard activity logs fetched.', { logs: data, totalMinutes: total }));
});

export const getMouseActivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

  res.json(new ApiResponse(200, 'Mouse activity fetched.', summary));
});

export const getIdleActivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const filter = buildActivityFilter(req);
  const { date } = req.query as Record<string, string>;

  if (date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end   = new Date(date); end.setHours(23, 59, 59, 999);
    (filter.startTime as Record<string, unknown>) = { $gte: start, $lte: end };
  }

  const logs = await ActivityLog.find({ ...filter, category: 'neutral' })
    .select('appName windowTitle durationMinutes startTime endTime userId')
    .populate('userId', 'name email')
    .sort({ startTime: 1 });

  const totalIdleMinutes = logs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

  res.json(new ApiResponse(200, 'Idle activity fetched.', { idleLogs: logs, totalIdleMinutes }));
});

export const getActivityTimeline = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

  res.json(new ApiResponse(200, 'Activity timeline fetched.', { date: targetDate.toISOString().split('T')[0], timeline }));
});

export const getActivityProductivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

  res.json(new ApiResponse(200, 'Productivity analytics fetched.', breakdown));
});

export const getAppUsage = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

  res.json(new ApiResponse(200, 'App usage stats fetched.', apps));
});

export const getWebsiteUsage = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

  res.json(new ApiResponse(200, 'Website usage stats fetched.', websites));
});
