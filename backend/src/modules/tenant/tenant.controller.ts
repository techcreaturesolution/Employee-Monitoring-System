import { Response } from 'express';
import { Tenant } from './tenant.model';
import { User } from '../employee/employee.model';
import { Subscription } from '../subscription/subscription.model';
import { AuthRequest } from '../../middleware/auth';
import { paginate } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

export const listTenants = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = 1, limit = 20, status, search } = req.query;
  const { skip, limit: lim } = paginate(Number(page), Number(limit));

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [tenants, total] = await Promise.all([
    Tenant.find(filter).skip(skip).limit(lim).sort({ createdAt: -1 }),
    Tenant.countDocuments(filter),
  ]);

  const tenantIds = tenants.map((t) => t._id);
  const counts = await User.aggregate([
    { $match: { tenantId: { $in: tenantIds } } },
    { $group: { _id: '$tenantId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  const tenantsWithCounts = tenants.map((t) => ({
    ...t.toObject(),
    employeeCount: countMap.get(String(t._id)) || 0,
  }));

  res.json(
    new ApiResponse(200, 'Tenants fetched.', {
      tenants: tenantsWithCounts,
      pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
    })
  );
});

export const getTenant = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenant = await Tenant.findById(id);
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found.');
  }

  const [employeeCount, subscription] = await Promise.all([
    User.countDocuments({ tenantId: id }),
    Subscription.findOne({ tenantId: id }),
  ]);

  res.json(new ApiResponse(200, 'Tenant fetched.', { ...tenant.toObject(), employeeCount, subscription }));
});

export const updateTenant = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const allowedUpdates = ['name', 'status', 'plan', 'phone', 'domain'];
  const updates: Record<string, unknown> = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const tenant = await Tenant.findByIdAndUpdate(id, updates, { new: true });
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found.');
  }

  res.json(new ApiResponse(200, 'Tenant updated.', tenant));
});

export const deleteTenant = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenant = await Tenant.findByIdAndUpdate(id, { status: 'suspended' }, { new: true });
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found.');
  }

  await User.updateMany({ tenantId: id }, { status: 'suspended' });
  res.json(new ApiResponse(200, 'Tenant suspended.'));
});
