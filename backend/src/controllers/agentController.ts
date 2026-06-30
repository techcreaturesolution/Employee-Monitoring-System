import { Response } from 'express';
import { User } from '../models/User';
import { Screenshot } from '../models/Screenshot';
import { ActivityLog } from '../models/ActivityLog';
import { Attendance } from '../models/Attendance';
import { Tenant } from '../models/Tenant';
import { AuthRequest } from '../middleware/auth';
import { formatDate, calculateWorkMinutes } from '../utils/helpers';
import path from 'path';
import { uploadToCloudinary, getCloudinaryThumbnail } from '../utils/cloudinary';

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

    const { activeApp, windowTitle } = req.body;

    let imageUrl = `/uploads/screenshots/${file.filename}`;
    let thumbnailUrl = `/uploads/screenshots/${file.filename}`;

    try {
      const cloudinaryResult = await uploadToCloudinary(file.path, 'screenshots');
      if (cloudinaryResult) {
        imageUrl = cloudinaryResult.secureUrl;
        thumbnailUrl = getCloudinaryThumbnail(cloudinaryResult.secureUrl);
      }
    } catch (uploadError) {
      console.error('Failed to upload screenshot to Cloudinary, using local fallback:', uploadError);
    }

    const screenshot = await Screenshot.create({
      userId,
      tenantId,
      timestamp: new Date(),
      imageUrl,
      thumbnailUrl,
      activeApp: activeApp || '',
      windowTitle: windowTitle || '',
      productivityTag: categorizeActivity(activeApp || '', windowTitle || '', ''),
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

const categorizeActivity = (appName: string, windowTitle: string, url: string): 'productive' | 'unproductive' | 'neutral' => {
  const text = `${appName} ${windowTitle} ${url}`.toLowerCase();
  
  const unproductiveKeywords = ['facebook', 'twitter', 'instagram', 'youtube', 'netflix', 'whatsapp', 'telegram', 'game', 'reddit', 'tiktok'];
  const productiveKeywords = ['vscode', 'visual studio', 'antigravity', 'ems', 'github', 'gitlab', 'jira', 'confluence', 'slack', 'teams', 'figma', 'postman', 'aws', 'gcp', 'azure', 'terminal', 'powershell', 'cmd', 'idea', 'pycharm', 'webstorm', 'excel', 'word', 'powerpoint', 'docs', 'sheets', 'trello', 'asana', 'notion', 'localhost'];

  for (const kw of unproductiveKeywords) {
    if (text.includes(kw)) return 'unproductive';
  }
  for (const kw of productiveKeywords) {
    if (text.includes(kw)) return 'productive';
  }
  return 'neutral';
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
      category: (a.category && a.category !== 'neutral') ? a.category : categorizeActivity(String(a.appName || ''), String(a.windowTitle || ''), String(a.url || '')),
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
      if (!attendance.punchOut) {
        res.status(400).json({ success: false, message: 'Already punched in.' });
        return;
      } else {
        // Resume shift
        attendance.punchOut = undefined;
        attendance.status = 'present';
        await attendance.save();
        res.status(200).json({ success: true, data: attendance });
        return;
      }
    }

    if (!attendance) {
      attendance = new Attendance({ userId, tenantId, date: today });
    }

    attendance.punchIn = {
      time: new Date(),
      ip: req.body.ip || req.ip || '',

      location: req.body.location || { latitude: 0, longitude: 0, address: '', accuracy: 0 },
      screenshotUrl: req.body.screenshotUrl || '',
      method: 'agent',
      isInsideGeofence: false,
    };
    attendance.status = 'present';
    await attendance.save();

    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Punch in failed.', error: (error as Error).message });
  }
};

export const getAgentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const today = formatDate(new Date());

    const attendance = await Attendance.findOne({ userId, date: today });
    const isPunchedIn = attendance ? !!attendance.punchIn && !attendance.punchOut : false;
    const punchInTime = attendance?.punchIn ? attendance.punchIn.time : null;
    const totalWorkMinutes = attendance?.totalWorkMinutes || 0;

    res.status(200).json({ success: true, data: { isPunchedIn, punchInTime, totalWorkMinutes } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch status.', error: (error as Error).message });
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

    // Simulate exactly 8 hours of work time for testing
    const simulatedPunchOutTime = new Date(attendance.punchIn.time.getTime() + 8 * 60 * 60 * 1000);

    attendance.punchOut = {
      time: simulatedPunchOutTime,
      ip: req.body.ip || req.ip || '',

      location: req.body.location || { latitude: 0, longitude: 0, address: '', accuracy: 0 },
      screenshotUrl: req.body.screenshotUrl || '',
      method: 'agent',
      isInsideGeofence: false,
    };

    const totalBreak = attendance.breaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    const totalWork = calculateWorkMinutes(attendance.punchIn.time, attendance.punchOut.time);
    const idleTime = attendance.idleMinutes || 0;
    attendance.totalWorkMinutes = Math.max(0, totalWork - totalBreak - idleTime);
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

export const agentSync = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const { activities, idleTimeMinutes } = req.body;

    if (Array.isArray(activities) && activities.length > 0) {
      const validCategories = ['productive', 'unproductive', 'neutral'];
      const docs = activities.map((a: Record<string, unknown>) => {
        const incomingCat = String(a.category || '');
        const category = validCategories.includes(incomingCat) && incomingCat !== 'neutral'
          ? incomingCat
          : categorizeActivity(String(a.appName || ''), String(a.windowTitle || ''), String(a.url || ''));

        return {
          userId,
          tenantId,
          appName: a.appName || 'Unknown',
          windowTitle: a.windowTitle || '',
          url: a.url || '',
          startTime: a.startTime ? new Date(a.startTime as string) : new Date(),
          endTime: a.endTime ? new Date(a.endTime as string) : undefined,
          durationMinutes: Number(a.durationMinutes) || 0,
          category,
        };
      });
      await ActivityLog.insertMany(docs);
    }

    if (idleTimeMinutes && Number(idleTimeMinutes) > 0) {
      const today = formatDate(new Date());
      const attendance = await Attendance.findOne({ userId, date: today });
      if (attendance && attendance.punchIn && !attendance.punchOut) {
        attendance.idleMinutes = (attendance.idleMinutes || 0) + Number(idleTimeMinutes);
        await attendance.save();
      }
    }

    res.json({ success: true, message: 'Sync complete.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sync failed.', error: (error as Error).message });
  }
};
