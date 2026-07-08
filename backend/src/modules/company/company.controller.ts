import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../../middleware/auth';
import { User } from '../employee/employee.model';
import { Attendance } from '../attendance/attendance.model';
import { ActivityLog } from '../activity/activity.model';
import { Screenshot } from '../screenshot/screenshot.model';
import { Tenant } from '../tenant/tenant.model';
import { logger } from '../../utils/logger';
import { formatDate } from '../../utils/helpers';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

export const getCompanyAnalytics = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const tenantObjId = new mongoose.Types.ObjectId(String(tenantId));
  const today = formatDate(new Date());

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const [
    tenant,
    totalEmployees,
    activeEmployees,
    totalManagers,
    todayPresent,
    todayAbsent,
    todayLate,
    monthlyAttendance,
    productivityBreakdown,
    topApps,
    departmentStats,
    screenshotCount,
  ] = await Promise.all([
    Tenant.findById(tenantId, 'name subscription settings'),

    User.countDocuments({ tenantId: tenantObjId, role: { $in: ['employee', 'manager'] } }),
    User.countDocuments({ tenantId: tenantObjId, role: { $in: ['employee', 'manager'] }, status: 'active' }),
    User.countDocuments({ tenantId: tenantObjId, role: 'manager' }),

    Attendance.countDocuments({ tenantId: tenantObjId, date: today, status: 'present' }),
    Attendance.countDocuments({ tenantId: tenantObjId, date: today, status: 'absent' }),
    Attendance.countDocuments({ tenantId: tenantObjId, date: today, status: 'late' }),

    Attendance.aggregate([
      {
        $match: {
          tenantId: tenantObjId,
          date: {
            $gte: formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
            $lte: today
          },
        },
      },
      { $group: { _id: { date: '$date', status: '$status' }, count: { $sum: 1 } } },
      { $sort: { '_id.date': 1 } },
    ]),

    ActivityLog.aggregate([
      { $match: { tenantId: tenantObjId, startTime: { $gte: startOfWeek } } },
      { $group: { _id: '$category', totalMinutes: { $sum: '$durationMinutes' } } },
    ]),

    ActivityLog.aggregate([
      { $match: { tenantId: tenantObjId, startTime: { $gte: startOfMonth } } },
      {
        $group: {
          _id: '$appName',
          totalMinutes: { $sum: '$durationMinutes' },
          userCount: { $addToSet: '$userId' },
        },
      },
      { $project: { appName: '$_id', totalMinutes: 1, userCount: { $size: '$userCount' } } },
      { $sort: { totalMinutes: -1 } },
      { $limit: 10 },
    ]),

    User.aggregate([
      { $match: { tenantId: tenantObjId, role: 'employee', status: 'active' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    Screenshot.countDocuments({ tenantId: tenantObjId, timestamp: { $gte: startOfMonth } }),
  ]);

  res.json(
    new ApiResponse(200, 'Company analytics fetched.', {
      company: {
        name: tenant?.name,
        plan: tenant?.plan,
        subscriptionId: (tenant as any)?.subscriptionId,
      },
      workforce: {
        totalEmployees,
        activeEmployees,
        totalManagers,
        inactiveEmployees: totalEmployees - activeEmployees,
      },
      todayAttendance: {
        present: todayPresent,
        absent: todayAbsent,
        late: todayLate,
        notMarked: activeEmployees - todayPresent - todayAbsent - todayLate,
      },
      monthlyAttendance,
      productivityBreakdown,
      topApps,
      departmentStats,
      screenshotCount,
    })
  );
});
