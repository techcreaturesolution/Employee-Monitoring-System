import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../../../middleware/auth';
import { User } from '../../employee/employee.model';
import { Attendance } from '../../attendance/attendance.model';
import { Screenshot } from '../../screenshot/screenshot.model';
import { ActivityLog } from '../../activity/activity.model';
import { cache } from '../../../services/cache';
import { formatDate } from '../../../utils/helpers';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ApiResponse } from '../../../utils/ApiResponse';
import { ApiError } from '../../../utils/ApiError';

export const getCompanyDashboard = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const cacheKey = `dashboard:company:${tenantId}`;
  const cached = await cache.get<any>(cacheKey);
  if (cached) {
    res.json(new ApiResponse(200, 'Company dashboard stats fetched (cached).', cached));
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
    todayAbsentCount,
    todayPresentCount,
    todayLateCount,
    last7DaysData,
    productivityBreakdown,
  ] = await Promise.all([
    User.countDocuments({ tenantId: tenantObjId, role: { $ne: 'super_admin' } }),
    User.countDocuments({ tenantId: tenantObjId, status: 'active', role: { $ne: 'super_admin' } }),
    Attendance.countDocuments({ tenantId: tenantObjId, date: today }),
    Screenshot.countDocuments({ tenantId: tenantObjId, timestamp: { $gte: new Date(today) } }),
    User.countDocuments({
      tenantId: tenantObjId,
      isOnline: true,
      role: 'employee',
      lastActive: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    }),
    Screenshot.find({ tenantId: tenantObjId })
      .populate('userId', 'name email avatar')
      .sort({ timestamp: -1 })
      .limit(8)
      .lean(),
    Attendance.aggregate([
      { $match: { tenantId: tenantObjId, date: today } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Attendance.countDocuments({ tenantId: tenantObjId, date: today, status: 'absent' }),
    Attendance.countDocuments({ tenantId: tenantObjId, date: today, status: 'present' }),
    Attendance.countDocuments({ tenantId: tenantObjId, date: today, status: 'late' }),
    Attendance.aggregate([
      {
        $match: {
          tenantId: tenantObjId,
          status: 'present',
          date: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().split('T')[0],
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
    ]),
    ActivityLog.aggregate([
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
    ]),
  ]);

  // Build map for quick lookup
  const attendanceMap = new Map(last7DaysData.map((item) => [item._id, item.count]));

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

  // Employees who have not marked attendance yet
  const notMarkedAttendance = activeEmployees - todayAttendanceRecords;

  const data = {
    stats: {
      totalEmployees,
      activeEmployees,
      todayPresent: todayPresentCount,
      todayLate: todayLateCount,
      todayAbsent: todayAbsentCount,
      notMarked: notMarkedAttendance,
      todayScreenshots,
      onlineNow,
    },
    attendanceStats,
    attendanceTrend: last7Days,
    productivityBreakdown,
    recentScreenshots,
  };

  await cache.set(cacheKey, data, 60); // 60s cache TTL

  res.json(new ApiResponse(200, 'Company dashboard stats fetched.', data));
});
