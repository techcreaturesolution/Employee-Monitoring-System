import { Response } from 'express';
import { Attendance } from './attendance.model';
import { AuthRequest } from '../../middleware/auth';
import { Tenant } from '../tenant/tenant.model';
import { User } from '../employee/employee.model';
import { createNotification } from '../../utils/notification';
import {
  formatDate,
  calculateWorkMinutes,
  paginate,
  isInsideGeofence,
  getMatchedOffice,
  isActiveBreak,
} from '../../utils/helpers';
import { logger } from '../../utils/logger';
import axios from 'axios';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import mongoose from 'mongoose';

const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: { 'User-Agent': 'EMS-Employee-Monitoring-System' },
      }
    );
    return res.data?.display_name || `${latitude}, ${longitude}`;
  } catch (error: any) {
    logger.error(`Reverse geocode failed: ${error.message}`);
    return `${latitude}, ${longitude}`;
  }
};

export const punchIn = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;
  const today = formatDate(new Date());

  const existing = await Attendance.findOne({ userId, date: today });
  if (existing?.punchIn) {
    throw new ApiError(400, 'Already punched in today.');
  }

  const { ip, location, screenshotUrl, method, workMode } = req.body;

  const tenant = await Tenant.findById(tenantId);
  const officeLocations = tenant?.settings?.officeLocations || [];

  let insideGeofence = false;
  let punchLocation = { latitude: 0, longitude: 0, address: 'Remote Location', accuracy: 0 };

  if (location && location.latitude && location.longitude) {
    insideGeofence = isInsideGeofence(location.latitude, location.longitude, officeLocations);
    if (insideGeofence) {
      const matchedOffice = getMatchedOffice(location.latitude, location.longitude, officeLocations);
      if (matchedOffice) {
        const office = officeLocations.find((o) => o.name === matchedOffice.name);
        if (office) {
          punchLocation = {
            latitude: office.latitude,
            longitude: office.longitude,
            address: `Office – ${office.name}`,
            accuracy: location.accuracy || 0,
          };
        }
      }
    } else {
      const address = location.address || (await reverseGeocode(location.latitude, location.longitude));
      punchLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        address,
        accuracy: location.accuracy || 0,
      };
    }
  }

  const attendance = existing || new Attendance({ userId, tenantId, date: today });
  attendance.workMode = insideGeofence ? 'office' : workMode || req.user?.workMode || 'office';
  attendance.punchIn = {
    time: new Date(),
    ip: ip || req.ip || '',
    location: punchLocation,
    screenshotUrl: screenshotUrl || '',
    method: method || 'web',
    isInsideGeofence: insideGeofence,
  };

  if (location && location.latitude && location.longitude) {
    await User.findByIdAndUpdate(userId, {
      lastKnownLocation: {
        latitude: punchLocation.latitude,
        longitude: punchLocation.longitude,
        address: punchLocation.address,
        updatedAt: new Date(),
      },
      lastActive: new Date(),
      isOnline: true,
    });
  }

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
    }).catch((err) => logger.error('Failed to notify employee of late punch-in:', err));

    User.find({ tenantId, role: { $in: ['manager', 'company_admin'] } })
      .then((managers) => {
        for (const mgr of managers) {
          createNotification(req.app, {
            tenantId: tenantId!,
            userId: mgr._id as any,
            type: 'attendance',
            title: 'Late Punch-in Alert',
            message: `${req.user?.name} punched in late today at ${timeStr}.`,
            link: '/attendance',
          }).catch((err) => logger.error('Failed to notify manager of late punch-in:', err));
        }
      })
      .catch((err) => logger.error('Failed to find managers for late punch-in notification:', err));
  }

  res.status(201).json(new ApiResponse(201, 'Punched in successfully.', attendance));
});

export const punchOut = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;
  const today = formatDate(new Date());

  const { location } = req.body;

  const tenant = await Tenant.findById(tenantId);
  const officeLocations = tenant?.settings?.officeLocations || [];

  let insideGeofence = false;
  let punchLocation = { latitude: 0, longitude: 0, address: 'Remote Location', accuracy: 0 };

  if (location && location.latitude && location.longitude) {
    insideGeofence = isInsideGeofence(location.latitude, location.longitude, officeLocations);
    if (insideGeofence) {
      const matchedOffice = getMatchedOffice(location.latitude, location.longitude, officeLocations);
      if (matchedOffice) {
        const office = officeLocations.find((o) => o.name === matchedOffice.name);
        if (office) {
          punchLocation = {
            latitude: office.latitude,
            longitude: office.longitude,
            address: `Office – ${office.name}`,
            accuracy: location.accuracy || 0,
          };
        }
      }
    } else {
      const address = location.address || (await reverseGeocode(location.latitude, location.longitude));
      punchLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        address,
        accuracy: location.accuracy || 0,
      };
    }
  }

  const punchOutData = {
    time: new Date(),
    ip: req.ip || '',
    location: punchLocation,
    screenshotUrl: '',
    method: 'web',
    isInsideGeofence: insideGeofence,
  };

  if (location && location.latitude && location.longitude) {
    await User.findByIdAndUpdate(userId, {
      lastKnownLocation: {
        latitude: punchLocation.latitude,
        longitude: punchLocation.longitude,
        address: punchLocation.address,
        updatedAt: new Date(),
      },
      lastActive: new Date(),
      isOnline: false,
    });
  }

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
    throw new ApiError(400, 'Already punched out or not punched in.');
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

  res.json(new ApiResponse(200, 'Punched out successfully.', attendance));
});

export const startBreak = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const today = formatDate(new Date());
  const { reason } = req.body;

  const attendance = await Attendance.findOne({ userId, date: today });
  if (!attendance) {
    throw new ApiError(404, 'No attendance record found for today.');
  }
  if (!attendance.punchIn || attendance.punchOut?.time) {
    throw new ApiError(400, 'Must be punched in and not punched out.');
  }

  const activeBreak = attendance.breaks.find((b) => isActiveBreak(b));
  if (activeBreak) {
    throw new ApiError(400, 'Already on a break.');
  }

  attendance.breaks.push({
    startTime: new Date(),
    endTime: undefined,
    duration: 0,
    reason: reason || '',
  });
  await attendance.save();

  res.json(new ApiResponse(200, 'Break started.', attendance));
});

export const endBreak = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const today = formatDate(new Date());

  const attendance = await Attendance.findOne({ userId, date: today });
  if (!attendance) {
    throw new ApiError(400, 'No attendance record found.');
  }

  const activeBreak = attendance.breaks.find((b) => isActiveBreak(b));
  if (!activeBreak) {
    throw new ApiError(400, 'No active break found.');
  }

  activeBreak.endTime = new Date();
  activeBreak.duration = calculateWorkMinutes(activeBreak.startTime, activeBreak.endTime);

  const totalBreak = attendance.breaks.reduce((sum, b) => sum + (b.duration || 0), 0);
  attendance.totalBreakMinutes = totalBreak;

  if (attendance.punchIn) {
    const currentEndTime = attendance.punchOut?.time || new Date();
    const totalWork = calculateWorkMinutes(attendance.punchIn.time, currentEndTime);
    const idleTime = attendance.idleMinutes || 0;
    attendance.totalWorkMinutes = Math.max(0, totalWork - totalBreak - idleTime);
  }

  await attendance.save();

  res.json(new ApiResponse(200, 'Break ended.', attendance));
});

export const getTodayAttendance = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const today = formatDate(new Date());

  const attendance = await Attendance.findOne({ userId, date: today });
  const attendanceObj = attendance ? attendance.toObject() : null;
  if (attendanceObj && attendanceObj.punchIn && !attendanceObj.punchOut) {
    let breakSum = attendanceObj.breaks.reduce((sum: number, b: any) => sum + (b.duration || 0), 0);
    const activeBreak = attendanceObj.breaks.find((b: any) => isActiveBreak(b));
    if (activeBreak) {
      const elapsedActiveBreak = calculateWorkMinutes(activeBreak.startTime, new Date());
      breakSum += elapsedActiveBreak;
    }
    attendanceObj.totalBreakMinutes = breakSum;

    const elapsed = calculateWorkMinutes(attendanceObj.punchIn.time, new Date());
    const idleTime = attendanceObj.idleMinutes || 0;
    attendanceObj.totalWorkMinutes = Math.max(0, elapsed - breakSum - idleTime);
  }

  res.json(new ApiResponse(200, 'Today attendance fetched.', attendanceObj));
});

export const getAttendanceHistory = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const { page = 1, limit = 30, startDate, endDate, userId } = req.query as any;
  const { skip, limit: lim } = paginate(Number(page), Number(limit));

  const todayStr = formatDate(new Date());
  const filter: Record<string, any> = { tenantId };

  if (req.user?.role === 'employee') {
    filter.userId = req.user._id;
  } else if (userId) {
    filter.userId = userId;
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = startDate;
    const maxDate = endDate ? (endDate < todayStr ? (endDate as string) : todayStr) : todayStr;
    filter.date.$lte = maxDate;
  } else {
    filter.date = { $lte: todayStr };
  }

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate('userId', 'name email employeeId department')
      .skip(skip)
      .limit(lim)
      .sort({ date: -1 })
      .lean(),
    Attendance.countDocuments(filter),
  ]);

  const updatedRecords = records.map((record: any) => {
    if (record.date === todayStr && record.punchIn && !record.punchOut) {
      let breakSum = record.breaks.reduce((sum: number, b: any) => sum + (b.duration || 0), 0);
      const activeBreak = record.breaks.find((b: any) => isActiveBreak(b));
      if (activeBreak) {
        const elapsedActiveBreak = calculateWorkMinutes(activeBreak.startTime, new Date());
        breakSum += elapsedActiveBreak;
      }
      record.totalBreakMinutes = breakSum;

      const elapsed = calculateWorkMinutes(record.punchIn.time, new Date());
      const idleTime = record.idleMinutes || 0;
      record.totalWorkMinutes = Math.max(0, elapsed - breakSum - idleTime);
    }
    return record;
  });

  res.json(
    new ApiResponse(200, 'Attendance history fetched.', {
      records: updatedRecords,
      pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
    })
  );
});

export const getAttendanceReport = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const { startDate, endDate } = req.query;

  const todayStr = formatDate(new Date());
  const matchFilter: Record<string, any> = { tenantId };
  if (startDate || endDate) {
    matchFilter.date = {};
    if (startDate) matchFilter.date.$gte = startDate;
    const maxDate = endDate ? (endDate < todayStr ? (endDate as string) : todayStr) : todayStr;
    matchFilter.date.$lte = maxDate;
  } else {
    matchFilter.date = { $lte: todayStr };
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

  res.json(new ApiResponse(200, 'Attendance report fetched.', report));
});
