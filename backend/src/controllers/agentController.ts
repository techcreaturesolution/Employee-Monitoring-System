import { Response } from 'express';
import { User } from '../models/User';
import { Screenshot } from '../models/Screenshot';
import { ActivityLog } from '../models/ActivityLog';
import { Attendance } from '../models/Attendance';
import { Tenant } from '../models/Tenant';
import { AuthRequest } from '../middleware/auth';
import { formatDate, calculateWorkMinutes } from '../utils/helpers';
import path from 'path';

export const agentHeartbeat = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    await User.findByIdAndUpdate(userId, {
      lastActive: new Date(),
      isOnline: true,
    });

    res.json({ success: true, message: 'Heartbeat received.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Heartbeat failed.', error: (error as Error).message });
  }
};

export const agentScreenshot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'No file provided.' });
      return;
    }

    const { activeApp, windowTitle, productivityTag } = req.body;

    const screenshot = await Screenshot.create({
      userId,
      tenantId,
      timestamp: new Date(),
      imageUrl: `/uploads/screenshots/${file.filename}`,
      thumbnailUrl: `/uploads/screenshots/${file.filename}`,
      activeApp: activeApp || '',
      windowTitle: windowTitle || '',
      productivityTag: productivityTag || 'neutral',
      metadata: {
        fileSize: file.size,
        format: path.extname(file.originalname).replace('.', ''),
      },
    });

    res.status(201).json({ success: true, data: screenshot });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed.', error: (error as Error).message });
  }
};

export const agentLogActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const { activities } = req.body;

    if (!Array.isArray(activities)) {
      res.status(400).json({ success: false, message: 'Activities array required.' });
      return;
    }

    const docs = activities.map((a: Record<string, unknown>) => ({
      userId,
      tenantId,
      appName: a.appName || 'Unknown',
      windowTitle: a.windowTitle || '',
      url: a.url || '',
      startTime: a.startTime ? new Date(a.startTime as string) : new Date(),
      endTime: a.endTime ? new Date(a.endTime as string) : undefined,
      durationMinutes: Number(a.durationMinutes) || 0,
      category: a.category || 'neutral',
    }));

    await ActivityLog.insertMany(docs);
    res.status(201).json({ success: true, message: 'Activities logged.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed.', error: (error as Error).message });
  }
};

export const agentPunchIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const today = formatDate(new Date());

    let attendance = await Attendance.findOne({ userId, date: today });
    if (attendance?.punchIn) {
      res.status(400).json({ success: false, message: 'Already punched in.' });
      return;
    }

    if (!attendance) {
      attendance = new Attendance({ userId, tenantId, date: today });
    }

    attendance.punchIn = {
      time: new Date(),
      ip: req.body.ip || req.ip || '',
      location: req.body.location || { latitude: 0, longitude: 0, address: '' },
      screenshotUrl: req.body.screenshotUrl || '',
      method: 'agent',
    };
    attendance.status = 'present';
    await attendance.save();

    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Punch in failed.', error: (error as Error).message });
  }
};

export const agentPunchOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const today = formatDate(new Date());

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance?.punchIn) {
      res.status(400).json({ success: false, message: 'Not punched in.' });
      return;
    }

    attendance.punchOut = {
      time: new Date(),
      ip: req.body.ip || req.ip || '',
      location: req.body.location || { latitude: 0, longitude: 0, address: '' },
      screenshotUrl: req.body.screenshotUrl || '',
      method: 'agent',
    };

    const totalBreak = attendance.breaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    const totalWork = calculateWorkMinutes(attendance.punchIn.time, attendance.punchOut.time);
    attendance.totalWorkMinutes = totalWork - totalBreak;
    attendance.totalBreakMinutes = totalBreak;

    await attendance.save();
    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Punch out failed.', error: (error as Error).message });
  }
};

export const getAgentConfig = async (req: AuthRequest, res: Response): Promise<void> => {
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
        screenshotInterval: tenant.settings.screenshotInterval,
        trackApps: tenant.settings.trackApps,
        trackUrls: tenant.settings.trackUrls,
        blurScreenshots: tenant.settings.blurScreenshots,
        workStartTime: tenant.settings.workStartTime,
        workEndTime: tenant.settings.workEndTime,
        idleTimeThreshold: tenant.settings.idleTimeThreshold,
        autoStopTracking: tenant.settings.autoStopTracking,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed.', error: (error as Error).message });
  }
};
