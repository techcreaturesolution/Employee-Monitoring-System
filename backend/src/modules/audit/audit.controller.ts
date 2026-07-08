import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { AuditLog } from './audit.model';
import { paginate } from '../../utils/helpers';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/audit-logs
// Query params: page, limit, userId, action, resource, startDate, endDate, status
// ─────────────────────────────────────────────────────────────────────────────
export const getAuditLogs = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new ApiError(401, 'Unauthorized');
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
      .sort({ createdAt: -1 })
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, 'Audit logs retrieved.', {
      logs,
      pagination: {
        total,
        page: Number(page),
        limit: lim,
        pages: Math.ceil(total / lim),
      },
    })
  );
});
