import { Request, Response } from 'express';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { Attendance } from '../models/Attendance';
import { LocationLog } from '../models/LocationLog';
import { AuthRequest } from '../middleware/auth';
import { generateTokens, formatDate, calculateWorkMinutes, isInsideGeofence } from '../utils/helpers';

export const mobileLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    user.lastActive = new Date();
    user.isOnline = true;
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);

    const tenant = user.tenantId ? await Tenant.findById(user.tenantId) : null;

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
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
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed.', error: (error as Error).message });
  }
};

export const mobilePunchIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const today = formatDate(new Date());

    const existing = await Attendance.findOne({ userId, date: today });
    if (existing?.punchIn) {
      res.status(400).json({ success: false, message: 'Already punched in today.' });
      return;
    }

    const { latitude, longitude, accuracy, address, workMode } = req.body;

    const tenant = await Tenant.findById(tenantId);
    const officeLocations = tenant?.settings?.officeLocations || [];
    const insideGeofence = isInsideGeofence(latitude || 0, longitude || 0, officeLocations);

    if (tenant?.settings?.requireLocationForPunch && (!latitude || !longitude)) {
      res.status(400).json({ success: false, message: 'Location is required for punch-in.' });
      return;
    }

    const attendance = existing || new Attendance({ userId, tenantId, date: today });
    attendance.workMode = workMode || req.user?.workMode || 'office';
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

    res.status(201).json({
      success: true,
      message: 'Punched in successfully.',
      data: { attendance, isInsideGeofence: insideGeofence },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Punch in failed.', error: (error as Error).message });
  }
};

export const mobilePunchOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
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

    res.json({
      success: true,
      message: 'Punched out successfully.',
      data: { attendance, isInsideGeofence: insideGeofence },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Punch out failed.', error: (error as Error).message });
  }
};

export const updateWorkMode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { workMode } = req.body;

    if (!['office', 'wfh', 'field'].includes(workMode)) {
      res.status(400).json({ success: false, message: 'Invalid work mode. Use office, wfh, or field.' });
      return;
    }

    await User.findByIdAndUpdate(userId, { workMode });

    const today = formatDate(new Date());
    await Attendance.findOneAndUpdate(
      { userId, date: today },
      { workMode }
    );

    res.json({ success: true, message: `Work mode updated to ${workMode}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update work mode.', error: (error as Error).message });
  }
};

export const getMobileConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant not found.' });
      return;
    }

    res.json({
      success: true,
      data: {
        enableGeofencing: tenant.settings.enableGeofencing,
        officeLocations: tenant.settings.officeLocations,
        mobileLocationInterval: tenant.settings.mobileLocationInterval,
        requireLocationForPunch: tenant.settings.requireLocationForPunch,
        workStartTime: tenant.settings.workStartTime,
        workEndTime: tenant.settings.workEndTime,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get config.', error: (error as Error).message });
  }
};

export const getMobileDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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

    res.json({
      success: true,
      data: {
        todayAttendance: attendance || null,
        workMode: req.user?.workMode || 'office',
        locationUpdates: todayLocations,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get dashboard.', error: (error as Error).message });
  }
};
