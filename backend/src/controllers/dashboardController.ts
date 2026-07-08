// FIXED VERSION: backend/src/controllers/dashboardController.ts
// This version correctly calculates absent employee count and other metrics

import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Attendance } from '../models/Attendance';
import { Screenshot } from '../models/Screenshot';
import { ActivityLog } from '../models/ActivityLog';
import { AuthRequest } from '../middleware/auth';
import { formatDate, calculateWorkMinutes } from '../utils/helpers';
import { logger } from '../utils/logger';

const getAdminDashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const tenantObjId = new mongoose.Types.ObjectId(String(tenantId));
    const today = formatDate(new Date());

    const [
      totalEmployees,
      activeEmployees,
      todayAttendanceRecords,
      todayScreenshots,
      onlineNow,
      recentScreenshots,
      attendanceStats,
      // ✅ FIX 1: Get actual count of absent employees (not just records)
      todayAbsentCount,
      todayPresentCount,
      todayLateCount,
    ] = await Promise.all([
      User.countDocuments({ tenantId: tenantObjId, role: { $ne: 'super_admin' } }),
      User.countDocuments({ tenantId: tenantObjId, status: 'active', role: { $ne: 'super_admin' } }),
      Attendance.countDocuments({ tenantId: tenantObjId, date: today }),  // Total records
      Screenshot.countDocuments({ tenantId: tenantObjId, timestamp: { $gte: new Date(today) } }),
      User.countDocuments({ tenantId: tenantObjId, isOnline: true, role: 'employee' }),
      Screenshot.find({ tenantId: tenantObjId })
        .populate('userId', 'name email avatar')
        .sort({ timestamp: -1 })
        .limit(8),
      Attendance.aggregate([
        { $match: { tenantId: tenantObjId, date: today } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      // ✅ FIX 2: Count records with actual status = 'absent'
      Attendance.countDocuments({ tenantId: tenantObjId, date: today, status: 'absent' }),
      // ✅ FIX 3: Count records with status = 'present'
      Attendance.countDocuments({ tenantId: tenantObjId, date: today, status: 'present' }),
      // ✅ FIX 4: Count records with status = 'late'
      Attendance.countDocuments({ tenantId: tenantObjId, date: today, status: 'late' }),
    ]);

    // Get attendance for last 7 days in ONE query
    const last7DaysData = await Attendance.aggregate([
      {
        $match: {
          tenantId: tenantObjId,
          status: 'present',
          date: {
            $gte: new Date(
              new Date().setDate(new Date().getDate() - 6)
            )
              .toISOString()
              .split('T')[0],
          },
        },
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Build map for quick lookup
    const attendanceMap = new Map(
      last7DaysData.map((item) => [item._id, item.count])
    );

    // Fill missing dates
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      last7Days.push({
        date: dateStr,
        present: attendanceMap.get(dateStr) || 0,
      });
    }

    const productivityBreakdown = await ActivityLog.aggregate([
      {
        $match: {
          tenantId: tenantObjId,
          startTime: { $gte: new Date(today) },
        },
      },
      {
        $group: {
          _id: '$category',
          totalMinutes: { $sum: '$durationMinutes' },
        },
      },
    ]);

    // ✅ FIX 5: Correct calculation logic
    // Employees who have not marked attendance yet
    const notMarkedAttendance = activeEmployees - todayAttendanceRecords;

    res.json({
      success: true,
      data: {
        stats: {
          totalEmployees,
          activeEmployees,
          // ✅ FIX 6: Use actual status counts instead of calculation
          todayPresent: todayPresentCount,
          todayLate: todayLateCount,
          todayAbsent: todayAbsentCount,
          notMarked: notMarkedAttendance,  // New: employees who haven't punched in/out
          todayScreenshots,
          onlineNow,
        },
        attendanceStats,
        attendanceTrend: last7Days,
        productivityBreakdown,
        recentScreenshots,
      },
    });
  } catch (error) {
    logger.error('Admin Dashboard failed:', error);
    next(error);
  }
};

const getEmployeeDashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    if (!userId || !tenantId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const tenantObjId = new mongoose.Types.ObjectId(String(tenantId));
    const userObjId = new mongoose.Types.ObjectId(String(userId));
    const today = formatDate(new Date());

    const [todayAttendance, todayScreenshots, recentActivity, weekAttendance] = await Promise.all([
      Attendance.findOne({ userId: userObjId, date: today }),
      Screenshot.countDocuments({ userId: userObjId, timestamp: { $gte: new Date(today) } }),
      ActivityLog.find({ userId: userObjId })
        .sort({ startTime: -1 })
        .limit(10),
      Attendance.find({
        userId: userObjId,
        date: {
          $gte: formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
          $lte: today,
        },
      }).sort({ date: -1 }),
    ]);

    const productivityToday = await ActivityLog.aggregate([
      {
        $match: {
          userId: userObjId,
          tenantId: tenantObjId,
          startTime: { $gte: new Date(today) },
        },
      },
      {
        $group: {
          _id: '$category',
          totalMinutes: { $sum: '$durationMinutes' },
        },
      },
    ]);

    const attendanceObj = todayAttendance ? todayAttendance.toObject() : null;
    if (attendanceObj && attendanceObj.punchIn && !attendanceObj.punchOut) {
      const elapsed = calculateWorkMinutes(attendanceObj.punchIn.time, new Date());
      const idleTime = attendanceObj.idleMinutes || 0;
      attendanceObj.totalWorkMinutes = Math.max(0, elapsed - attendanceObj.totalBreakMinutes - idleTime);
    }

    res.json({
      success: true,
      data: {
        todayAttendance: attendanceObj,
        todayScreenshots,
        recentActivity,
        weekAttendance,
        productivityToday,
      },
    });
  } catch (error) {
    logger.error('Employee Dashboard failed:', error);
    next(error);
  }
};

export { getAdminDashboard, getEmployeeDashboard };

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/super-admin
// Cross-tenant platform-wide stats (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const getSuperAdminDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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

    res.json({
      success: true,
      data: {
        platform: { totalTenants, totalUsers, activeUsers, todayScreenshots, todayAttendanceCount },
        tenantBreakdown,
      },
    });
  } catch (error) {
    logger.error('Super Admin Dashboard failed:', error);
    next(error);
  }
};

