import { Response } from 'express';
import { User } from '../models/User';
import { Attendance } from '../models/Attendance';
import { Screenshot } from '../models/Screenshot';
import { ActivityLog } from '../models/ActivityLog';
import { AuthRequest } from '../middleware/auth';
import { formatDate } from '../utils/helpers';

export const getAdminDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const today = formatDate(new Date());

    const [
      totalEmployees,
      activeEmployees,
      todayAttendance,
      todayScreenshots,
      onlineNow,
      recentScreenshots,
      attendanceStats,
    ] = await Promise.all([
      User.countDocuments({ tenantId, role: { $ne: 'super_admin' } }),
      User.countDocuments({ tenantId, status: 'active', role: { $ne: 'super_admin' } }),
      Attendance.countDocuments({ tenantId, date: today }),
      Screenshot.countDocuments({ tenantId, timestamp: { $gte: new Date(today) } }),
      User.countDocuments({ tenantId, isOnline: true }),
      Screenshot.find({ tenantId })
        .populate('userId', 'name email avatar')
        .sort({ timestamp: -1 })
        .limit(8),
      Attendance.aggregate([
        { $match: { tenantId, date: today } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const count = await Attendance.countDocuments({ tenantId, date: dateStr, status: 'present' });
      last7Days.push({ date: dateStr, present: count });
    }

    const productivityBreakdown = await ActivityLog.aggregate([
      {
        $match: {
          tenantId,
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

    res.json({
      success: true,
      data: {
        stats: {
          totalEmployees,
          activeEmployees,
          todayPresent: todayAttendance,
          todayAbsent: activeEmployees - todayAttendance,
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
    res.status(500).json({ success: false, message: 'Dashboard failed.', error: (error as Error).message });
  }
};

export const getEmployeeDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const today = formatDate(new Date());

    const [todayAttendance, todayScreenshots, recentActivity, weekAttendance] = await Promise.all([
      Attendance.findOne({ userId, date: today }),
      Screenshot.countDocuments({ userId, timestamp: { $gte: new Date(today) } }),
      ActivityLog.find({ userId })
        .sort({ startTime: -1 })
        .limit(10),
      Attendance.find({
        userId,
        date: {
          $gte: formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
          $lte: today,
        },
      }).sort({ date: -1 }),
    ]);

    const productivityToday = await ActivityLog.aggregate([
      {
        $match: {
          userId,
          tenantId,
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

    res.json({
      success: true,
      data: {
        todayAttendance,
        todayScreenshots,
        recentActivity,
        weekAttendance,
        productivityToday,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Dashboard failed.', error: (error as Error).message });
  }
};
