import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../../../middleware/auth';
import { Attendance } from '../../attendance/attendance.model';
import { Screenshot } from '../../screenshot/screenshot.model';
import { ActivityLog } from '../../activity/activity.model';
import { cache } from '../../../services/cache';
import { formatDate, calculateWorkMinutes, isActiveBreak } from '../../../utils/helpers';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ApiResponse } from '../../../utils/ApiResponse';
import { ApiError } from '../../../utils/ApiError';

export const getEmployeeDashboard = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;
  if (!userId || !tenantId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const cacheKey = `dashboard:employee:${userId}`;
  const cached = await cache.get<any>(cacheKey);
  if (cached) {
    res.json(new ApiResponse(200, 'Employee dashboard stats fetched (cached).', cached));
    return;
  }

  const tenantObjId = new mongoose.Types.ObjectId(String(tenantId));
  const userObjId = new mongoose.Types.ObjectId(String(userId));
  const today = formatDate(new Date());

  const [todayAttendance, todayScreenshots, recentActivity, weekAttendance, productivityToday] = await Promise.all([
    Attendance.findOne({ userId: userObjId, date: today }),
    Screenshot.countDocuments({ userId: userObjId, timestamp: { $gte: new Date(today) } }),
    ActivityLog.find({ userId: userObjId })
      .sort({ startTime: -1 })
      .limit(10)
      .lean(),
    Attendance.find({
      userId: userObjId,
      date: {
        $gte: formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        $lte: today,
      },
    })
      .sort({ date: -1 })
      .lean(),
    ActivityLog.aggregate([
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
    ]),
  ]);

  const attendanceObj = todayAttendance ? todayAttendance.toObject() : null;
  if (attendanceObj && attendanceObj.punchIn && !attendanceObj.punchOut) {
    const elapsed = calculateWorkMinutes(attendanceObj.punchIn.time, new Date());
    const idleTime = attendanceObj.idleMinutes || 0;
    attendanceObj.totalWorkMinutes = Math.max(0, elapsed - attendanceObj.totalBreakMinutes - idleTime);
  }

  const data = {
    todayAttendance: attendanceObj,
    todayScreenshots,
    recentActivity,
    weekAttendance,
    productivityToday,
  };

  await cache.set(cacheKey, data, 60); // 60s cache TTL

  res.json(new ApiResponse(200, 'Employee dashboard stats fetched.', data));
});
