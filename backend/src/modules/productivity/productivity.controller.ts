import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ProductivityKeyword } from './productivity.model';
import { ActivityLog } from '../activity/activity.model';
import { logger } from '../../utils/logger';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

// ============================================================
// Helper: Classify a single activity entry against keywords
// ============================================================
async function classifyActivity(
  appName: string,
  windowTitle: string,
  url: string,
  tenantId: string
): Promise<'productive' | 'neutral' | 'unproductive'> {
  const keywords = await ProductivityKeyword.find({
    tenantId,
    enabled: true,
  }).sort({ priority: -1 });

  for (const kw of keywords) {
    const target =
      kw.type === 'app'
        ? appName.toLowerCase()
        : kw.type === 'url'
        ? (url || '').toLowerCase()
        : (windowTitle || '').toLowerCase();

    const searchTerm = kw.keyword.toLowerCase();

    let matched = false;
    switch (kw.matchType) {
      case 'exact':
        matched = target === searchTerm;
        break;
      case 'contains':
        matched = target.includes(searchTerm);
        break;
      case 'regex':
        try {
          matched = new RegExp(searchTerm, 'i').test(target);
        } catch {
          matched = false;
        }
        break;
    }

    if (matched) return kw.category as 'productive' | 'neutral' | 'unproductive';
  }

  return 'neutral';
}

// ============================================================
// GET /api/productivity/stats?userId=xxx&date=2026-07-01
// ============================================================
export const getProductivityStats = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId?.toString() || '';
  const { date, userId } = req.query;

  const targetUserId =
    ['employee', 'hr'].includes(req.user?.role || '')
      ? req.user?._id?.toString()
      : (userId as string) || req.user?._id?.toString() || '';

  if (!targetUserId) {
    throw new ApiError(400, 'User ID required');
  }

  const queryDate = date ? new Date(date as string) : new Date();
  const startOfDay = new Date(queryDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(queryDate);
  endOfDay.setHours(23, 59, 59, 999);

  const activities = await ActivityLog.find({
    userId: new mongoose.Types.ObjectId(targetUserId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    startTime: { $gte: startOfDay, $lte: endOfDay },
  });

  let productive = 0;
  let neutral = 0;
  let unproductive = 0;

  for (const activity of activities) {
    const durationSec = (activity.durationMinutes || 0) * 60;
    const category = await classifyActivity(
      activity.appName,
      activity.windowTitle,
      activity.url,
      tenantId
    );
    if (category === 'productive') productive += durationSec;
    else if (category === 'unproductive') unproductive += durationSec;
    else neutral += durationSec;
  }

  const total = productive + neutral + unproductive;

  const topApps = await ActivityLog.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(targetUserId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
        startTime: { $gte: startOfDay, $lte: endOfDay },
      },
    },
    {
      $group: {
        _id: '$appName',
        totalMinutes: { $sum: '$durationMinutes' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalMinutes: -1 } },
    { $limit: 10 },
  ]);

  const topWebsites = await ActivityLog.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(targetUserId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
        startTime: { $gte: startOfDay, $lte: endOfDay },
        url: { $ne: '', $exists: true },
      },
    },
    {
      $group: {
        _id: '$url',
        totalMinutes: { $sum: '$durationMinutes' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalMinutes: -1 } },
    { $limit: 10 },
  ]);

  res.json(
    new ApiResponse(200, 'Productivity stats fetched.', {
      date: queryDate.toISOString().split('T')[0],
      stats: {
        productive,
        neutral,
        unproductive,
        total,
        productivePercent: total > 0 ? Math.round((productive / total) * 100) : 0,
        neutralPercent: total > 0 ? Math.round((neutral / total) * 100) : 0,
        unproductivePercent: total > 0 ? Math.round((unproductive / total) * 100) : 0,
      },
      topApps,
      topWebsites,
    })
  );
});

// ============================================================
// GET /api/productivity/range?userId=xxx&startDate=xxx&endDate=xxx
// ============================================================
export const getProductivityRange = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId?.toString() || '';
  const { startDate, endDate, userId } = req.query;

  if (!startDate || !endDate) {
    throw new ApiError(400, 'startDate and endDate are required (YYYY-MM-DD)');
  }

  const targetUserId =
    ['employee', 'hr'].includes(req.user?.role || '')
      ? req.user?._id?.toString()
      : (userId as string) || req.user?._id?.toString() || '';

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  end.setHours(23, 59, 59, 999);

  const activities = await ActivityLog.find({
    userId: new mongoose.Types.ObjectId(targetUserId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    startTime: { $gte: start, $lte: end },
  });

  let productive = 0;
  let neutral = 0;
  let unproductive = 0;

  for (const activity of activities) {
    const durationSec = (activity.durationMinutes || 0) * 60;
    const category = await classifyActivity(
      activity.appName,
      activity.windowTitle,
      activity.url,
      tenantId
    );
    if (category === 'productive') productive += durationSec;
    else if (category === 'unproductive') unproductive += durationSec;
    else neutral += durationSec;
  }

  const total = productive + neutral + unproductive;

  res.json(
    new ApiResponse(200, 'Productivity range fetched.', {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      stats: {
        productive,
        neutral,
        unproductive,
        total,
        productivePercent: total > 0 ? Math.round((productive / total) * 100) : 0,
        neutralPercent: total > 0 ? Math.round((neutral / total) * 100) : 0,
        unproductivePercent: total > 0 ? Math.round((unproductive / total) * 100) : 0,
      },
    })
  );
});

// ============================================================
// GET /api/productivity/keywords?category=productive
// ============================================================
export const listKeywords = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const { category } = req.query;

  const filter: Record<string, unknown> = { tenantId };
  if (category) filter.category = category;

  const keywords = await ProductivityKeyword.find(filter).sort({ category: 1, priority: -1 });

  res.json(new ApiResponse(200, 'Keywords fetched.', { keywords, count: keywords.length }));
});

// ============================================================
// POST /api/productivity/keywords
// ============================================================
export const createKeyword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const { keyword, category, type, matchType, priority } = req.body;

  if (!keyword || !category || !type) {
    throw new ApiError(400, 'keyword, category, and type are required');
  }

  const newKeyword = await ProductivityKeyword.create({
    tenantId,
    keyword: keyword.toLowerCase().trim(),
    category,
    type,
    matchType: matchType || 'contains',
    priority: priority || 5,
    createdBy: req.user?._id,
  });

  res.status(201).json(new ApiResponse(201, 'Keyword created.', newKeyword));
});

// ============================================================
// PUT /api/productivity/keywords/:id
// ============================================================
export const updateKeyword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { keyword, category, type, matchType, priority, enabled } = req.body;

  const updated = await ProductivityKeyword.findByIdAndUpdate(
    id,
    {
      ...(keyword && { keyword: keyword.toLowerCase().trim() }),
      ...(category && { category }),
      ...(type && { type }),
      ...(matchType && { matchType }),
      ...(priority !== undefined && { priority }),
      ...(enabled !== undefined && { enabled }),
    },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new ApiError(404, 'Keyword not found');
  }

  res.json(new ApiResponse(200, 'Keyword updated.', updated));
});

// ============================================================
// DELETE /api/productivity/keywords/:id
// ============================================================
export const deleteKeyword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const deleted = await ProductivityKeyword.findByIdAndDelete(id);

  if (!deleted) {
    throw new ApiError(404, 'Keyword not found');
  }

  res.json(new ApiResponse(200, 'Keyword deleted.'));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/productivity — overview
// ─────────────────────────────────────────────────────────────────────────────
export const getProductivityOverview = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId?.toString() || '';
  const targetUserId =
    ['employee', 'hr'].includes(req.user?.role || '')
      ? req.user?._id?.toString()
      : (req.query.userId as string) || req.user?._id?.toString() || '';

  const today = new Date();
  const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay   = new Date(today); endOfDay.setHours(23, 59, 59, 999);

  const activities = await ActivityLog.find({
    userId: new mongoose.Types.ObjectId(targetUserId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    startTime: { $gte: startOfDay, $lte: endOfDay },
  });

  let productive = 0; let neutral = 0; let unproductive = 0;
  for (const a of activities) {
    const cat = await classifyActivity(a.appName, a.windowTitle, a.url, tenantId);
    const sec = (a.durationMinutes || 0) * 60;
    if (cat === 'productive') productive += sec;
    else if (cat === 'unproductive') unproductive += sec;
    else neutral += sec;
  }
  const total = productive + neutral + unproductive;

  res.json(
    new ApiResponse(200, 'Productivity overview fetched.', {
      date: today.toISOString().split('T')[0],
      productive, neutral, unproductive, total,
      productivePercent: total > 0 ? Math.round((productive / total) * 100) : 0,
    })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/productivity/summary
// ─────────────────────────────────────────────────────────────────────────────
export const getProductivitySummary = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const tenantObjId = new mongoose.Types.ObjectId(String(tenantId));

  const now = new Date();
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);

  const summary = await ActivityLog.aggregate([
    { $match: { tenantId: tenantObjId, startTime: { $gte: startOfWeek } } },
    {
      $group: {
        _id: { category: '$category', date: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } } },
        totalMinutes: { $sum: '$durationMinutes' },
        userCount: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        category: '$_id.category',
        date: '$_id.date',
        totalMinutes: 1,
        userCount: { $size: '$userCount' },
      },
    },
    { $sort: { date: 1 } },
  ]);

  res.json(new ApiResponse(200, 'Productivity summary fetched.', { weekStart: startOfWeek.toISOString(), summary }));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/productivity/employee/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getEmployeeProductivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId?.toString() || '';
  const { startDate, endDate, date } = req.query as Record<string, string>;

  if (['employee', 'hr'].includes(req.user?.role || '') && req.user?._id?.toString() !== id) {
    throw new ApiError(403, 'Forbidden: Cannot access other users data');
  }

  const queryDate = date ? new Date(date) : new Date();
  const start = startDate ? new Date(startDate) : new Date(queryDate.getFullYear(), queryDate.getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  const userId = new mongoose.Types.ObjectId(id);
  const tenantObjId = new mongoose.Types.ObjectId(tenantId);

  const activities = await ActivityLog.find({
    userId,
    tenantId: tenantObjId,
    startTime: { $gte: start, $lte: end },
  });

  let productive = 0; let neutral = 0; let unproductive = 0;
  for (const a of activities) {
    const cat = await classifyActivity(a.appName, a.windowTitle, a.url, tenantId);
    const sec = (a.durationMinutes || 0) * 60;
    if (cat === 'productive') productive += sec;
    else if (cat === 'unproductive') unproductive += sec;
    else neutral += sec;
  }
  const total = productive + neutral + unproductive;

  const topApps = await ActivityLog.aggregate([
    { $match: { userId, tenantId: tenantObjId, startTime: { $gte: start, $lte: end } } },
    { $group: { _id: '$appName', totalMinutes: { $sum: '$durationMinutes' }, count: { $sum: 1 } } },
    { $sort: { totalMinutes: -1 } },
    { $limit: 10 },
  ]);

  res.json(
    new ApiResponse(200, 'Employee productivity fetched.', {
      period: { start: start.toISOString(), end: end.toISOString() },
      stats: {
        productive, neutral, unproductive, total,
        productivePercent: total > 0 ? Math.round((productive / total) * 100) : 0,
        score: total > 0 ? Math.round((productive / total) * 100) : 0,
      },
      topApps,
    })
  );
});
