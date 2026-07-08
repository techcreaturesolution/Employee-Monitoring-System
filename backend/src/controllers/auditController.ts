import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AuditLog } from '../models/AuditLog';
import { paginate } from '../utils/helpers';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/audit-logs
// Query params: page, limit, userId, action, resource, startDate, endDate
// ─────────────────────────────────────────────────────────────────────────────
export const getAuditLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { page = 1, limit = 50, userId, action, resource, startDate, endDate, status } = req.query;
    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const filter: Record<string, unknown> = { tenantId };

    if (userId) filter.userId = userId;
    if (action) filter.action = { $regex: action as string, $options: 'i' };
    if (resource) filter.resource = resource;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) (filter.createdAt as Record<string, unknown>).$gte = new Date(startDate as string);
      if (endDate) (filter.createdAt as Record<string, unknown>).$lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'name email role employeeId')
        .skip(skip)
        .limit(lim)
        .sort({ createdAt: -1 }),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: Number(page),
          limit: lim,
          pages: Math.ceil(total / lim),
        },
      },
    });
  } catch (error) {
    logger.error('getAuditLogs failed:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: createAuditEntry (used internally from other controllers)
// ─────────────────────────────────────────────────────────────────────────────
export const createAuditEntry = async (params: {
  tenantId: unknown;
  userId: unknown;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failure';
}): Promise<void> => {
  try {
    await AuditLog.create({
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId || '',
      details: params.details || {},
      ipAddress: params.ipAddress || '',
      userAgent: params.userAgent || '',
      status: params.status || 'success',
    });
  } catch (err) {
    logger.error('createAuditEntry failed (non-fatal):', err);
  }
};
