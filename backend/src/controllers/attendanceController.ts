import { Response } from 'express';
import { Attendance } from '../models/Attendance';
import { AuthRequest } from '../middleware/auth';
import { formatDate, calculateWorkMinutes, paginate } from '../utils/helpers';

export const punchIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const today = formatDate(new Date());

    const existing = await Attendance.findOne({ userId, date: today });
    if (existing?.punchIn) {
      res.status(400).json({ success: false, message: 'Already punched in today.' });
      return;
    }

    const { ip, location, screenshotUrl, method } = req.body;

    const attendance = existing || new Attendance({ userId, tenantId, date: today });
    attendance.punchIn = {
      time: new Date(),
      ip: ip || req.ip || '',
      location: location || { latitude: 0, longitude: 0, address: '' },
      screenshotUrl: screenshotUrl || '',
      method: method || 'web',
    };
    attendance.status = 'present';
    await attendance.save();

    res.status(201).json({ success: true, message: 'Punched in successfully.', data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Punch in failed.', error: (error as Error).message });
  }
};

export const punchOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const today = formatDate(new Date());

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance?.punchIn) {
      res.status(400).json({ success: false, message: 'Not punched in today.' });
      return;
    }
    if (attendance.punchOut?.time) {
      res.status(400).json({ success: false, message: 'Already punched out today.' });
      return;
    }

    const { ip, location, screenshotUrl, method } = req.body;

    attendance.punchOut = {
      time: new Date(),
      ip: ip || req.ip || '',
      location: location || { latitude: 0, longitude: 0, address: '' },
      screenshotUrl: screenshotUrl || '',
      method: method || 'web',
    };

    const totalBreak = attendance.breaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    const totalWork = calculateWorkMinutes(attendance.punchIn.time, attendance.punchOut.time);
    attendance.totalWorkMinutes = totalWork - totalBreak;
    attendance.totalBreakMinutes = totalBreak;

    const standardWorkMinutes = 480;
    if (attendance.totalWorkMinutes > standardWorkMinutes) {
      attendance.overtimeMinutes = attendance.totalWorkMinutes - standardWorkMinutes;
    }

    await attendance.save();

    res.json({ success: true, message: 'Punched out successfully.', data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Punch out failed.', error: (error as Error).message });
  }
};

export const startBreak = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const today = formatDate(new Date());
    const { reason } = req.body;

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance?.punchIn || attendance.punchOut?.time) {
      res.status(400).json({ success: false, message: 'Must be punched in and not punched out.' });
      return;
    }

    const activeBreak = attendance.breaks.find((b) => !b.endTime);
    if (activeBreak) {
      res.status(400).json({ success: false, message: 'Already on a break.' });
      return;
    }

    attendance.breaks.push({
      startTime: new Date(),
      endTime: new Date(0),
      duration: 0,
      reason: reason || '',
    });
    await attendance.save();

    res.json({ success: true, message: 'Break started.', data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start break.', error: (error as Error).message });
  }
};

export const endBreak = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const today = formatDate(new Date());

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance) {
      res.status(400).json({ success: false, message: 'No attendance record found.' });
      return;
    }

    const activeBreak = attendance.breaks.find((b) => !b.endTime || b.endTime.getTime() === 0);
    if (!activeBreak) {
      res.status(400).json({ success: false, message: 'No active break found.' });
      return;
    }

    activeBreak.endTime = new Date();
    activeBreak.duration = calculateWorkMinutes(activeBreak.startTime, activeBreak.endTime);
    await attendance.save();

    res.json({ success: true, message: 'Break ended.', data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to end break.', error: (error as Error).message });
  }
};

export const getTodayAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const today = formatDate(new Date());

    const attendance = await Attendance.findOne({ userId, date: today });
    res.json({ success: true, data: attendance || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get attendance.', error: (error as Error).message });
  }
};

export const getAttendanceHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId || req.user?._id;
    const tenantId = req.user?.tenantId;
    const { page = 1, limit = 30, startDate, endDate } = req.query;
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

    res.json({
      success: true,
      data: {
        records,
        pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get history.', error: (error as Error).message });
  }
};

export const getAttendanceReport = async (req: AuthRequest, res: Response): Promise<void> => {
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
    res.status(500).json({ success: false, message: 'Failed to generate report.', error: (error as Error).message });
  }
};
