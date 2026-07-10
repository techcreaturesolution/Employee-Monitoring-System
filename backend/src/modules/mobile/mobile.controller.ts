import { Request, Response } from 'express';
import { User } from '../employee/employee.model';
import { Tenant } from '../tenant/tenant.model';
import { Attendance } from '../attendance/attendance.model';
import { LocationLog } from '../location/location.model';
import { WFHRequest } from '../wfh/wfh.model';
import { AuthRequest } from '../../middleware/auth';
import { generateTokens, formatDate, calculateWorkMinutes, isInsideGeofence } from '../../utils/helpers';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

export const mobileLogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, deviceId } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (user.status !== 'active') {
    throw new ApiError(403, 'Your account has been deactivated.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  user.lastActive = new Date();
  user.isOnline = true;
  if (deviceId) {
    user.deviceFingerprints = user.deviceFingerprints || [];
    if (!user.deviceFingerprints.includes(deviceId)) {
      user.deviceFingerprints.push(deviceId);
    }
  }
  await user.save();

  const { accessToken, refreshToken } = generateTokens(user);

  const tenant = user.tenantId ? await Tenant.findById(user.tenantId) : null;

  res.json(
    new ApiResponse(200, 'Login successful.', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        department: user.department,
        designation: user.designation,
        workMode: user.workMode,
        avatar: user.avatar,
        phone: user.phone,
        agentKey: user.agentKey,
      },
      tenant: tenant
        ? {
            id: tenant._id,
            name: tenant.name,
            plan: tenant.plan,
            settings: {
              enableGeofencing: tenant.settings.enableGeofencing,
              officeLocations: tenant.settings.officeLocations,
              mobileLocationInterval: tenant.settings.mobileLocationInterval,
              requireLocationForPunch: tenant.settings.requireLocationForPunch,
              workStartTime: tenant.settings.workStartTime,
              workEndTime: tenant.settings.workEndTime,
            },
          }
        : null,
      accessToken,
      refreshToken,
    })
  );
});

export const mobilePunchIn = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;
  const today = formatDate(new Date());

  const existing = await Attendance.findOne({ userId, date: today });
  if (existing?.punchIn) {
    throw new ApiError(400, 'Already punched in today.');
  }

  const { latitude, longitude, accuracy, address, workMode } = req.body;

  const tenant = await Tenant.findById(tenantId);
  const officeLocations = tenant?.settings?.officeLocations || [];
  const insideGeofence = isInsideGeofence(latitude || 0, longitude || 0, officeLocations);

  if (tenant?.settings?.requireLocationForPunch && (!latitude || !longitude)) {
    throw new ApiError(400, 'Location is required for punch-in.');
  }

  const finalWorkMode = workMode || req.user?.workMode || 'office';

  if (finalWorkMode === 'office') {
    if ((latitude || longitude) && !insideGeofence) {
      throw new ApiError(400, 'You must be inside an office geofence to punch in for office work mode.');
    }
  } else if (finalWorkMode === 'wfh') {
    const targetDate = new Date(today);
    targetDate.setHours(0, 0, 0, 0);
    const wfhReq = await WFHRequest.findOne({ tenantId, userId, date: targetDate, status: 'approved' });
    if (!wfhReq) {
      throw new ApiError(403, 'You do not have an approved WFH request for today.');
    }
  }

  const attendance = existing || new Attendance({ userId, tenantId, date: today });
  attendance.workMode = finalWorkMode;
  attendance.punchIn = {
    time: new Date(),
    ip: req.ip || '',
    location: {
      latitude: latitude || 0,
      longitude: longitude || 0,
      address: address || '',
      accuracy: accuracy || 0,
    },
    screenshotUrl: '',
    method: 'mobile',
    isInsideGeofence: insideGeofence,
  };
  attendance.status = 'present';
  await attendance.save();

  if (latitude && longitude) {
    await LocationLog.create({
      userId,
      tenantId,
      latitude,
      longitude,
      accuracy: accuracy || 0,
      address: address || '',
      source: 'mobile',
      workMode: attendance.workMode,
      isInsideGeofence: insideGeofence,
      timestamp: new Date(),
    });

    await User.findByIdAndUpdate(userId, {
      workMode: attendance.workMode,
      lastKnownLocation: {
        latitude,
        longitude,
        address: address || '',
        updatedAt: new Date(),
      },
      lastActive: new Date(),
      isOnline: true,
    });
  }

  res.status(201).json(
    new ApiResponse(201, 'Punched in successfully.', { attendance, isInsideGeofence: insideGeofence })
  );
});

export const mobilePunchOut = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;
  const today = formatDate(new Date());

  const attendance = await Attendance.findOne({ userId, date: today });
  if (!attendance?.punchIn) {
    throw new ApiError(400, 'Not punched in today.');
  }
  if (attendance.punchOut?.time) {
    throw new ApiError(400, 'Already punched out today.');
  }

  const { latitude, longitude, accuracy, address } = req.body;

  const tenant = await Tenant.findById(tenantId);
  const officeLocations = tenant?.settings?.officeLocations || [];
  const insideGeofence = isInsideGeofence(latitude || 0, longitude || 0, officeLocations);

  attendance.punchOut = {
    time: new Date(),
    ip: req.ip || '',
    location: {
      latitude: latitude || 0,
      longitude: longitude || 0,
      address: address || '',
      accuracy: accuracy || 0,
    },
    screenshotUrl: '',
    method: 'mobile',
    isInsideGeofence: insideGeofence,
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

  if (latitude && longitude) {
    await LocationLog.create({
      userId,
      tenantId,
      latitude,
      longitude,
      accuracy: accuracy || 0,
      address: address || '',
      source: 'mobile',
      workMode: attendance.workMode,
      isInsideGeofence: insideGeofence,
      timestamp: new Date(),
    });
  }

  res.json(
    new ApiResponse(200, 'Punched out successfully.', { attendance, isInsideGeofence: insideGeofence })
  );
});

export const updateWorkMode = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const { workMode } = req.body;

  if (!['office', 'wfh', 'field'].includes(workMode)) {
    throw new ApiError(400, 'Invalid work mode. Use office, wfh, or field.');
  }

  if (workMode === 'wfh') {
    const today = formatDate(new Date());
    const targetDate = new Date(today);
    targetDate.setHours(0, 0, 0, 0);
    const wfhReq = await WFHRequest.findOne({ tenantId: req.user?.tenantId, userId, date: targetDate, status: 'approved' });
    if (!wfhReq) {
      throw new ApiError(403, 'You do not have an approved WFH request for today. Cannot switch to wfh mode.');
    }
  }

  await User.findByIdAndUpdate(userId, { workMode });

  const today = formatDate(new Date());
  await Attendance.findOneAndUpdate(
    { userId, date: today },
    { workMode }
  );

  res.json(new ApiResponse(200, `Work mode updated to ${workMode}.`));
});

export const getMobileConfig = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const tenant = await Tenant.findById(tenantId);

  if (!tenant) {
    throw new ApiError(404, 'Tenant not found.');
  }

  res.json(
    new ApiResponse(200, 'Mobile config fetched.', {
      enableGeofencing: tenant.settings.enableGeofencing,
      officeLocations: tenant.settings.officeLocations,
      mobileLocationInterval: tenant.settings.mobileLocationInterval,
      requireLocationForPunch: tenant.settings.requireLocationForPunch,
      workStartTime: tenant.settings.workStartTime,
      workEndTime: tenant.settings.workEndTime,
    })
  );
});

export const getMobileDashboard = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const today = formatDate(new Date());

  const attendance = await Attendance.findOne({ userId, date: today });

  const todayLocations = await LocationLog.countDocuments({
    userId,
    timestamp: {
      $gte: new Date(today + 'T00:00:00.000Z'),
      $lte: new Date(today + 'T23:59:59.999Z'),
    },
  });

  res.json(
    new ApiResponse(200, 'Mobile dashboard fetched.', {
      todayAttendance: attendance || null,
      workMode: req.user?.workMode || 'office',
      locationUpdates: todayLocations,
    })
  );
});
