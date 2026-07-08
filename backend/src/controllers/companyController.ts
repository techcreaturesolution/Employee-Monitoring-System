import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Attendance } from '../models/Attendance';
import { ActivityLog } from '../models/ActivityLog';
import { Screenshot } from '../models/Screenshot';
import { Tenant } from '../models/Tenant';
import { logger } from '../utils/logger';
import { formatDate } from '../utils/helpers';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/company/analytics
// Company-wide analytics overview (super_admin / company_admin)
// ─────────────────────────────────────────────────────────────────────────────
export const getCompanyAnalytics = async (
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

    const tenantObjId = new mongoose.Types.ObjectId(String(tenantId));
    const today = formatDate(new Date());

    // Build date ranges
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

      // Monthly attendance trend (last 30 days)
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

      // Productivity breakdown this week
      ActivityLog.aggregate([
        { $match: { tenantId: tenantObjId, startTime: { $gte: startOfWeek } } },
        { $group: { _id: '$category', totalMinutes: { $sum: '$durationMinutes' } } },
      ]),

      // Top 10 applications used this month
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

      // Per-department employee & attendance stats
      User.aggregate([
        { $match: { tenantId: tenantObjId, role: 'employee', status: 'active' } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Screenshot.countDocuments({ tenantId: tenantObjId, timestamp: { $gte: startOfMonth } }),
    ]);

    res.json({
      success: true,
      data: {
        company: {
          name: tenant?.name,
          plan: tenant?.plan,
          subscriptionId: tenant?.subscriptionId,
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
      },
    });
  } catch (error) {
    logger.error('getCompanyAnalytics failed:', error);
    next(error);
  }
};
