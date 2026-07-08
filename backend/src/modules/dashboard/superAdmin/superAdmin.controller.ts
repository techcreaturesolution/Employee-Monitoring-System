import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { User } from '../../employee/employee.model';
import { Screenshot } from '../../screenshot/screenshot.model';
import { Attendance } from '../../attendance/attendance.model';
import { cache } from '../../../services/cache';
import { formatDate } from '../../../utils/helpers';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ApiResponse } from '../../../utils/ApiResponse';

export const getSuperAdminDashboard = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const cacheKey = 'dashboard:superAdmin';
  
  const cached = await cache.get<any>(cacheKey);
  if (cached) {
    res.json(new ApiResponse(200, 'Super admin stats fetched (cached).', cached));
    return;
  }

  const today = formatDate(new Date());

  const [
    totalTenants,
    totalUsers,
    activeUsers,
    todayScreenshots,
    todayAttendanceCount,
    tenantBreakdown,
  ] = await Promise.all([
    User.distinct('tenantId').then((ids) => ids.length),
    User.countDocuments({ role: { $ne: 'super_admin' } }),
    User.countDocuments({ status: 'active', role: { $ne: 'super_admin' } }),
    Screenshot.countDocuments({ timestamp: { $gte: new Date(today) } }),
    Attendance.countDocuments({ date: today }),
    User.aggregate([
      { $match: { role: { $ne: 'super_admin' } } },
      { $group: { _id: '$tenantId', employeeCount: { $sum: 1 }, activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
      { $lookup: { from: 'tenants', localField: '_id', foreignField: '_id', as: 'tenant' } },
      { $unwind: { path: '$tenant', preserveNullAndEmptyArrays: true } },
      { $project: { tenantName: '$tenant.name', employeeCount: 1, activeCount: 1 } },
      { $sort: { employeeCount: -1 } },
    ]),
  ]);

  const data = {
    platform: { totalTenants, totalUsers, activeUsers, todayScreenshots, todayAttendanceCount },
    tenantBreakdown,
  };

  await cache.set(cacheKey, data, 60); // 60s cache TTL

  res.json(new ApiResponse(200, 'Super admin stats fetched.', data));
});
