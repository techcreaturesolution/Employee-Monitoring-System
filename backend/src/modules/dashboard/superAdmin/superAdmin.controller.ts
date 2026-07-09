import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { User } from '../../employee/employee.model';
import { Attendance } from '../../attendance/attendance.model';
import { Tenant } from '../../tenant/tenant.model';
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

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const [
    totalTenants,
    activeTenants,
    trialTenants,
    suspendedTenants,
    totalUsers,
    activeUsers,
    onlineNow,
    newSignupsThisWeek,
    newSignupsThisMonth,
    planDistribution,
    trialsExpiringSoon,
    tenantBreakdown,
    attendanceTrend,
  ] = await Promise.all([
    Tenant.countDocuments(),
    Tenant.countDocuments({ status: 'active' }),
    Tenant.countDocuments({ status: 'trial' }),
    Tenant.countDocuments({ status: 'suspended' }),
    User.countDocuments({ role: { $ne: 'super_admin' } }),
    User.countDocuments({ status: 'active', role: { $ne: 'super_admin' } }),
    User.countDocuments({ isOnline: true, role: 'employee', lastActive: { $gte: fiveMinAgo } }),
    Tenant.countDocuments({ createdAt: { $gte: startOfWeek } }),
    Tenant.countDocuments({ createdAt: { $gte: startOfMonth } }),
    // Plan distribution
    Tenant.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]),
    // Trials expiring soon
    Tenant.find({ status: 'trial', trialEndsAt: { $lte: sevenDaysFromNow } }).select('name trialEndsAt').lean(),
    // Tenant breakdown
    Tenant.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'tenantId',
          as: 'users',
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          plan: 1,
          status: 1,
          createdAt: 1,
          trialEndsAt: 1,
          employeeCount: { $size: '$users' },
          activeCount: {
            $size: { $filter: { input: '$users', cond: { $eq: ['$$this.status', 'active'] } } },
          },
          onlineNow: {
            $size: { $filter: { input: '$users', cond: { $eq: ['$$this.isOnline', true] } } },
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]),
    // Platform-wide attendance trend (last 7 days)
    Attendance.aggregate([
      { $match: { status: 'present', date: { $gte: formatDate(startOfWeek) } } },
      { $group: { _id: '$date', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const data = {
    platformHealth: {
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      totalUsers,
      activeUsers,
      onlineNow,
      newSignupsThisWeek,
      newSignupsThisMonth,
    },
    revenue: {
      planDistribution: planDistribution.map(p => ({ plan: p._id || 'free', count: p.count })),
      trialsExpiringSoon,
    },
    tenantBreakdown,
    activityTrend: {
      attendance: attendanceTrend.map(a => ({ date: a._id, count: a.count })),
    },
  };

  await cache.set(cacheKey, data, 60); // 60s cache TTL

  res.json(new ApiResponse(200, 'Super admin stats fetched.', data));
});
