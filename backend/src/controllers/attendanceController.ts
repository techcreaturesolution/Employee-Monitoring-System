import { Response, NextFunction } from 'express';
import { Attendance } from '../models/Attendance';
import { AuthRequest } from '../middleware/auth';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { createNotification } from '../utils/notification';
import { formatDate, calculateWorkMinutes, paginate } from '../utils/helpers';
import { logger } from '../utils/logger';

const punchIn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const today = formatDate(new Date());

    const existing = await Attendance.findOne({ userId, date: today });
    if (existing?.punchIn) {
      res.status(400).json({ success: false, message: 'Already punched in today.' });
      return;
    }

    const { ip, location, screenshotUrl, method, workMode } = req.body;

    const attendance = existing || new Attendance({ userId, tenantId, date: today });
    attendance.workMode = workMode || req.user?.workMode || 'office';
    attendance.punchIn = {
      time: new Date(),
      ip: ip || req.ip || '',
      location: location || { latitude: 0, longitude: 0, address: '', accuracy: 0 },
      screenshotUrl: screenshotUrl || '',
      method: method || 'web',
      isInsideGeofence: false,
    };
    const tenant = await Tenant.findById(tenantId);
    let isLate = false;
    if (tenant?.settings?.workStartTime) {
      const [startHour, startMin] = tenant.settings.workStartTime.split(':').map(Number);
      const now = new Date();
      const nowHour = now.getHours();
      const nowMin = now.getMinutes();
      if (nowHour > startHour || (nowHour === startHour && nowMin > startMin)) {
        isLate = true;
      }
    }

    attendance.status = isLate ? 'late' : 'present';
    await attendance.save();

    if (isLate) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      createNotification(req.app, {
        tenantId: tenantId!,
        userId: userId!,
        type: 'attendance',
        title: 'Late Punch-in Alert',
        message: `You punched in late today at ${timeStr}.`,
      }).catch(err => logger.error('Failed to notify employee of late punch-in:', err));

      User.find({ tenantId, role: { $in: ['manager', 'company_admin'] } })
        .then(managers => {
          for (const mgr of managers) {
            createNotification(req.app, {
              tenantId: tenantId!,
              userId: mgr._id as any,
              type: 'attendance',
              title: 'Late Punch-in Alert',
              message: `${req.user?.name} punched in late today at ${timeStr}.`,
              link: '/attendance',
            }).catch(err => logger.error('Failed to notify manager of late punch-in:', err));
          }
        })
        .catch(err => logger.error('Failed to find managers for late punch-in notification:', err));
    }

    res.status(201).json({ success: true, message: 'Punched in successfully.', data: attendance });
  } catch (error) {
    logger.error('punchIn failed:', error);
    next(error);
  }
};

const punchOut = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    const today = formatDate(new Date());

    const { ip, location, screenshotUrl, method } = req.body;

    const punchOutData = {
      time: new Date(),
      ip: ip || req.ip || '',
      location: location || { latitude: 0, longitude: 0, address: '', accuracy: 0 },
      screenshotUrl: screenshotUrl || '',
      method: method || 'web',
      isInsideGeofence: false,
    };

    const attendance = await Attendance.findOneAndUpdate(
      {
        userId,
        date: today,
        'punchIn.time': { $exists: true },
        'punchOut.time': { $exists: false },
      },
      { $set: { punchOut: punchOutData } },
      { new: true }
    );

    if (!attendance) {
      res.status(400).json({ success: false, message: 'Already punched out or not punched in.' });
      return;
    }

    const totalBreak = attendance.breaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    const totalWork = calculateWorkMinutes(attendance.punchIn!.time, attendance.punchOut!.time);
    attendance.totalWorkMinutes = totalWork - totalBreak;
    attendance.totalBreakMinutes = totalBreak;

    const standardWorkMinutes = 480;
    if (attendance.totalWorkMinutes > standardWorkMinutes) {
      attendance.overtimeMinutes = attendance.totalWorkMinutes - standardWorkMinutes;
    }

    await attendance.save();

    res.json({ success: true, message: 'Punched out successfully.', data: attendance });
  } catch (error) {
    logger.error('punchOut failed:', error);
    next(error);
  }
};

const startBreak = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    const today = formatDate(new Date());
    const { reason } = req.body;

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance) {
      res.status(404).json({ success: false, message: 'No attendance record found for today.' });
      return;
    }
    if (!attendance.punchIn || attendance.punchOut?.time) {
      res.status(400).json({ success: false, message: 'Must be punched in and not punched out.' });
      return;
    }

    const activeBreak = attendance.breaks.find((b) => !b.endTime);  // ✅ FIX: Use !b.endTime (null/undefined)
    if (activeBreak) {
      res.status(400).json({ success: false, message: 'Already on a break.' });
      return;
    }

    attendance.breaks.push({
      startTime: new Date(),
      endTime: undefined,  // ✅ FIX 1: Use undefined for optional Date field (null not assignable to Date)
      duration: 0,
      reason: reason || '',
    });
    await attendance.save();

    res.json({ success: true, message: 'Break started.', data: attendance });
  } catch (error) {
    logger.error('startBreak failed:', error);
    next(error);
  }
};

const endBreak = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    const today = formatDate(new Date());

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance) {
      res.status(400).json({ success: false, message: 'No attendance record found.' });
      return;
    }

    // ✅ FIX 2: Simpler check - only need to check if endTime is null/undefined
    const activeBreak = attendance.breaks.find((b) => !b.endTime);
    if (!activeBreak) {
      res.status(400).json({ success: false, message: 'No active break found.' });
      return;
    }

    activeBreak.endTime = new Date();
    activeBreak.duration = calculateWorkMinutes(activeBreak.startTime, activeBreak.endTime);

    // Recalculate total break minutes
    const totalBreak = attendance.breaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    attendance.totalBreakMinutes = totalBreak;

    // Recalculate total work minutes so far
    if (attendance.punchIn) {
      const currentEndTime = attendance.punchOut?.time || new Date();
      const totalWork = calculateWorkMinutes(attendance.punchIn.time, currentEndTime);
      const idleTime = attendance.idleMinutes || 0;
      attendance.totalWorkMinutes = Math.max(0, totalWork - totalBreak - idleTime);
    }

    await attendance.save();

    res.json({ success: true, message: 'Break ended.', data: attendance });
  } catch (error) {
    logger.error('endBreak failed:', error);
    next(error);
  }
};

const getTodayAttendance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    const today = formatDate(new Date());

    const attendance = await Attendance.findOne({ userId, date: today });
    const attendanceObj = attendance ? attendance.toObject() : null;
    if (attendanceObj && attendanceObj.punchIn && !attendanceObj.punchOut) {
      let breakSum = attendanceObj.breaks.reduce((sum: number, b: any) => sum + (b.duration || 0), 0);
      const activeBreak = attendanceObj.breaks.find((b: any) => !b.endTime);
      if (activeBreak) {
        const elapsedActiveBreak = calculateWorkMinutes(activeBreak.startTime, new Date());
        breakSum += elapsedActiveBreak;
      }
      attendanceObj.totalBreakMinutes = breakSum;

      const elapsed = calculateWorkMinutes(attendanceObj.punchIn.time, new Date());
      const idleTime = attendanceObj.idleMinutes || 0;
      attendanceObj.totalWorkMinutes = Math.max(0, elapsed - breakSum - idleTime);
    }

    res.json({ success: true, data: attendanceObj });
  } catch (error) {
    logger.error('getTodayAttendance failed:', error);
    next(error);
  }
};

const getAttendanceHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { page = 1, limit = 30, startDate, endDate, userId } = req.query;
    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const filter: Record<string, unknown> = { tenantId };

    if (req.user?.role === 'employee') {
      filter.userId = req.user._id;
    } else if (userId) {
      filter.userId = userId;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) (filter.date as Record<string, unknown>).$gte = startDate;
      if (endDate) (filter.date as Record<string, unknown>).$lte = endDate;
    }

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate('userId', 'name email employeeId department')
        .skip(skip)
        .limit(lim)
        .sort({ date: -1 }),
      Attendance.countDocuments(filter),
    ]);

    const todayStr = formatDate(new Date());
    const updatedRecords = records.map((record) => {
      const obj = record.toObject();
      if (obj.date === todayStr && obj.punchIn && !obj.punchOut) {
        let breakSum = obj.breaks.reduce((sum: number, b: any) => sum + (b.duration || 0), 0);
        const activeBreak = obj.breaks.find((b: any) => !b.endTime);
        if (activeBreak) {
          const elapsedActiveBreak = calculateWorkMinutes(activeBreak.startTime, new Date());
          breakSum += elapsedActiveBreak;
        }
        obj.totalBreakMinutes = breakSum;

        const elapsed = calculateWorkMinutes(obj.punchIn.time, new Date());
        const idleTime = obj.idleMinutes || 0;
        obj.totalWorkMinutes = Math.max(0, elapsed - breakSum - idleTime);
      }
      return obj;
    });

    res.json({
      success: true,
      data: {
        records: updatedRecords,
        pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
      },
    });
  } catch (error) {
    logger.error('getAttendanceHistory failed:', error);
    next(error);
  }
};

const getAttendanceReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { startDate, endDate } = req.query;

    const matchFilter: Record<string, unknown> = { tenantId };
    if (startDate || endDate) {
      matchFilter.date = {};
      if (startDate) (matchFilter.date as Record<string, unknown>).$gte = startDate;
      if (endDate) (matchFilter.date as Record<string, unknown>).$lte = endDate;
    }

    const report = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$userId',
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          halfDays: { $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] } },
          totalWorkMinutes: { $sum: '$totalWorkMinutes' },
          totalOvertimeMinutes: { $sum: '$overtimeMinutes' },
          avgWorkMinutes: { $avg: '$totalWorkMinutes' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          userName: '$user.name',
          userEmail: '$user.email',
          department: '$user.department',
          totalDays: 1,
          presentDays: 1,
          lateDays: 1,
          halfDays: 1,
          totalWorkMinutes: 1,
          totalOvertimeMinutes: 1,
          avgWorkMinutes: { $round: ['$avgWorkMinutes', 0] },
        },
      },
    ]);

    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('getAttendanceReport failed:', error);
    next(error);
  }
};

export {
  punchIn,
  punchOut,
  startBreak,
  endBreak,
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceReport,
};
