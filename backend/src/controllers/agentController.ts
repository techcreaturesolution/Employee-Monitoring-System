import { Response } from 'express';
import { User } from '../models/User';
import { createNotification } from '../utils/notification';
import { Screenshot } from '../models/Screenshot';
import { ActivityLog } from '../models/ActivityLog';
import { Attendance } from '../models/Attendance';
import { Tenant } from '../models/Tenant';
import { AuthRequest } from '../middleware/auth';
import { formatDate, calculateWorkMinutes, isActiveBreak } from '../utils/helpers';
import path from 'path';
import fs from 'fs';
import { uploadToCloudinary, getCloudinaryThumbnail, isCloudinaryConfigured } from '../utils/cloudinary';

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
    let publicId = '';
    let uploadedToCloud = false;

    // Check Cloudinary config first
    if (!isCloudinaryConfigured) {
      console.warn('⚠️  Cloudinary not configured. Screenshots will be stored locally.');
    } else {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const emailOrId = req.user?.email || String(userId);
        const customFolder = `ems/screenshots/${emailOrId}/${year}/${month}`;

        // IMPORTANT: Use absolute path — relative paths like './uploads/...' fail on Render
        const absoluteFilePath = path.resolve(file.path);
        console.log(`📤 Uploading screenshot to Cloudinary...`);
        console.log(`   File path : ${absoluteFilePath}`);
        console.log(`   File exists: ${fs.existsSync(absoluteFilePath)}`);
        console.log(`   Cloud folder: ${customFolder}`);

        const cloudinaryResult = await uploadToCloudinary(absoluteFilePath, 'screenshots', customFolder);
        if (cloudinaryResult) {
          imageUrl = cloudinaryResult.secureUrl;
          thumbnailUrl = getCloudinaryThumbnail(cloudinaryResult.secureUrl);
          publicId = cloudinaryResult.publicId;
          uploadedToCloud = true;
          console.log(`✅ Screenshot uploaded to Cloudinary: ${publicId}`);
          console.log(`   URL: ${imageUrl}`);
        } else {
          console.error('❌ Cloudinary uploadToCloudinary returned null — falling back to local storage.');
        }
      } catch (uploadError) {
        // ⚠️ DO NOT delete the file here — fall back to local storage instead of returning 503
        console.error('❌ Cloudinary upload error (falling back to local):', (uploadError as Error).message);
        // imageUrl / thumbnailUrl already point to local path — we continue normally below
      }
    }

    const screenshot = await Screenshot.create({
      userId,
      tenantId,
      timestamp: new Date(),
      imageUrl,
      publicId,
      thumbnailUrl,
      activeApp: activeApp || '',
      windowTitle: windowTitle || '',
      productivityTag: categorizeActivity(activeApp || '', windowTitle || '', ''),
      metadata: {
        fileSize: file.size,
        format: path.extname(file.originalname).replace('.', ''),
        uploadedToCloud,
      },
    });

    // Notify managers and admins
    if (tenantId) {
      User.find({ tenantId, role: { $in: ['manager', 'company_admin'] } })
        .then(managers => {
          for (const mgr of managers) {
            createNotification(req.app, {
              tenantId,
              userId: mgr._id as any,
              type: 'screenshot',
              title: 'New Agent Screenshot',
              message: `${req.user?.name || 'Employee'} uploaded a new agent screenshot.`,
              link: '/screenshots',
            }).catch(err => console.error('Failed to create agent screenshot notification:', err));
          }
        })
        .catch(err => console.error('Failed to find managers for agent screenshot notification:', err));
    }

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

    // Filter out activities that already exist in the database (matching userId and startTime)
    const startTimes = docs.map(d => d.startTime);
    const existingLogs = await ActivityLog.find({
      userId,
      startTime: { $in: startTimes }
    }, 'startTime');

    const existingTimes = new Set(existingLogs.map(e => e.startTime.getTime()));
    const uniqueDocs = docs.filter(d => !existingTimes.has(d.startTime.getTime()));

    if (uniqueDocs.length > 0) {
      await ActivityLog.insertMany(uniqueDocs);
      res.status(201).json({ success: true, message: `${uniqueDocs.length} activities logged.`, data: { count: uniqueDocs.length } });
    } else {
      res.status(200).json({ success: true, message: 'No new activities to log.', data: { count: 0 } });
    }
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

    // Update User online status and location
    const updateFields: any = { isOnline: true, lastActive: new Date() };
    if (req.body.location && req.body.location.latitude && req.body.location.longitude) {
      updateFields.lastKnownLocation = {
        latitude: req.body.location.latitude,
        longitude: req.body.location.longitude,
        address: req.body.location.address || '',
        updatedAt: new Date(),
      };
    }
    await User.findByIdAndUpdate(userId, updateFields);

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
    
    let totalBreakMinutes = 0;
    if (attendance) {
      let breakSum = attendance.breaks.reduce((sum, b) => sum + (b.duration || 0), 0);
      const activeBreak = attendance.breaks.find((b) => isActiveBreak(b));
      if (activeBreak) {
        const elapsedActiveBreak = calculateWorkMinutes(activeBreak.startTime, new Date());
        breakSum += elapsedActiveBreak;
      }
      totalBreakMinutes = breakSum;
    }

    let totalWorkMinutes = attendance?.totalWorkMinutes || 0;
    if (attendance && attendance.punchIn && !attendance.punchOut) {
      const elapsed = calculateWorkMinutes(attendance.punchIn.time, new Date());
      const idleTime = attendance.idleMinutes || 0;
      totalWorkMinutes = Math.max(0, elapsed - totalBreakMinutes - idleTime);
    }

    const activeBreak = attendance?.breaks.find((b) => isActiveBreak(b));
    const isOnBreak = !!activeBreak;

    res.status(200).json({ success: true, data: { isPunchedIn, punchInTime, totalWorkMinutes, totalBreakMinutes, isOnBreak, breaks: attendance?.breaks || [] } });
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

    const punchOutTime = new Date();

    attendance.punchOut = {
      time: punchOutTime,
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

    // Update User online status
    await User.findByIdAndUpdate(userId, { isOnline: false, lastActive: new Date() });

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

      // Filter out activities that already exist in the database (matching userId and startTime)
      const startTimes = docs.map(d => d.startTime);
      const existingLogs = await ActivityLog.find({
        userId,
        startTime: { $in: startTimes }
      }, 'startTime');

      const existingTimes = new Set(existingLogs.map(e => e.startTime.getTime()));
      const uniqueDocs = docs.filter(d => !existingTimes.has(d.startTime.getTime()));

      if (uniqueDocs.length > 0) {
        await ActivityLog.insertMany(uniqueDocs);
      }
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
