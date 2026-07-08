import { Response } from 'express';
import { User } from '../employee/employee.model';
import { createNotification } from '../../utils/notification';
import { Screenshot } from '../screenshot/screenshot.model';
import { ActivityLog } from '../activity/activity.model';
import { Attendance } from '../attendance/attendance.model';
import { Tenant } from '../tenant/tenant.model';
import { AuthRequest } from '../../middleware/auth';
import { formatDate, calculateWorkMinutes, isActiveBreak } from '../../utils/helpers';
import path from 'path';
import fs from 'fs';
import { uploadToCloudinary, getCloudinaryThumbnail, isCloudinaryConfigured } from '../../utils/cloudinary';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

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

export const agentHeartbeat = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;

  await User.findByIdAndUpdate(userId, {
    lastActive: new Date(),
    isOnline: true,
  });

  res.json(new ApiResponse(200, 'Heartbeat received.'));
});

export const agentScreenshot = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;
  const file = req.file;

  if (!file) {
    throw new ApiError(400, 'No file provided.');
  }

  const { activeApp, windowTitle } = req.body;

  let imageUrl = `/uploads/screenshots/${file.filename}`;
  let thumbnailUrl = `/uploads/screenshots/${file.filename}`;
  let publicId = '';
  let uploadedToCloud = false;

  if (!isCloudinaryConfigured) {
    console.warn('⚠️  Cloudinary not configured. Screenshots will be stored locally.');
  } else {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const emailOrId = req.user?.email || String(userId);
      const customFolder = `ems/screenshots/${emailOrId}/${year}/${month}`;

      const absoluteFilePath = path.resolve(file.path);
      const cloudinaryResult = await uploadToCloudinary(absoluteFilePath, 'screenshots', customFolder);
      if (cloudinaryResult) {
        imageUrl = cloudinaryResult.secureUrl;
        thumbnailUrl = getCloudinaryThumbnail(cloudinaryResult.secureUrl);
        publicId = cloudinaryResult.publicId;
        uploadedToCloud = true;
      }
    } catch (uploadError) {
      console.error('❌ Cloudinary upload error (falling back to local):', (uploadError as Error).message);
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
            tenantId: tenantId!,
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

  res.status(201).json(new ApiResponse(201, 'Screenshot uploaded.', screenshot));
});

export const agentLogActivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;
  const { activities } = req.body;

  if (!Array.isArray(activities)) {
    throw new ApiError(400, 'Activities array required.');
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

  const startTimes = docs.map(d => d.startTime);
  const existingLogs = await ActivityLog.find({ userId, startTime: { $in: startTimes } }, 'startTime');
  const existingTimes = new Set(existingLogs.map(e => e.startTime.getTime()));
  const uniqueDocs = docs.filter(d => !existingTimes.has(d.startTime.getTime()));

  if (uniqueDocs.length > 0) {
    await ActivityLog.insertMany(uniqueDocs);
    res.status(201).json(new ApiResponse(201, `${uniqueDocs.length} activities logged.`, { count: uniqueDocs.length }));
  } else {
    res.json(new ApiResponse(200, 'No new activities to log.', { count: 0 }));
  }
});

export const agentPunchIn = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;
  const today = formatDate(new Date());

  let attendance = await Attendance.findOne({ userId, date: today });
  if (attendance?.punchIn) {
    if (!attendance.punchOut) {
      throw new ApiError(400, 'Already punched in.');
    } else {
      // Resume shift
      attendance.punchOut = undefined;
      attendance.status = 'present';
      await attendance.save();
      res.json(new ApiResponse(200, 'Shift resumed.', attendance));
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

  const updateFields: any = { isOnline: true, lastActive: new Date() };
  if (req.body.location?.latitude && req.body.location?.longitude) {
    updateFields.lastKnownLocation = {
      latitude: req.body.location.latitude,
      longitude: req.body.location.longitude,
      address: req.body.location.address || '',
      updatedAt: new Date(),
    };
  }
  await User.findByIdAndUpdate(userId, updateFields);

  res.status(201).json(new ApiResponse(201, 'Punched in.', attendance));
});

export const getAgentStatus = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

  res.json(
    new ApiResponse(200, 'Agent status fetched.', {
      isPunchedIn, punchInTime, totalWorkMinutes, totalBreakMinutes, isOnBreak,
      breaks: attendance?.breaks || [],
    })
  );
});

export const agentPunchOut = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const today = formatDate(new Date());

  const attendance = await Attendance.findOne({ userId, date: today });
  if (!attendance?.punchIn) {
    throw new ApiError(400, 'Not punched in.');
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
  await User.findByIdAndUpdate(userId, { isOnline: false, lastActive: new Date() });

  res.json(new ApiResponse(200, 'Punched out.', attendance));
});

export const getAgentConfig = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const tenant = await Tenant.findById(tenantId);

  if (!tenant) {
    throw new ApiError(404, 'Tenant not found.');
  }

  res.json(
    new ApiResponse(200, 'Agent config fetched.', {
      screenshotInterval: tenant.settings.screenshotInterval,
      trackApps: tenant.settings.trackApps,
      trackUrls: tenant.settings.trackUrls,
      blurScreenshots: tenant.settings.blurScreenshots,
      workStartTime: tenant.settings.workStartTime,
      workEndTime: tenant.settings.workEndTime,
      idleTimeThreshold: tenant.settings.idleTimeThreshold,
      autoStopTracking: tenant.settings.autoStopTracking,
    })
  );
});

export const agentSync = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

    const startTimes = docs.map(d => d.startTime);
    const existingLogs = await ActivityLog.find({ userId, startTime: { $in: startTimes } }, 'startTime');
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

  res.json(new ApiResponse(200, 'Sync complete.'));
});
