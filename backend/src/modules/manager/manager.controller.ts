import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../../middleware/auth';
import { User } from '../employee/employee.model';
import { Attendance } from '../attendance/attendance.model';
import { ActivityLog } from '../activity/activity.model';
import { Screenshot } from '../screenshot/screenshot.model';
import { Notification } from '../notification/notification.model';
import { logger } from '../../utils/logger';
import { formatDate } from '../../utils/helpers';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

export const listManagers = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const managers = await User.find(
    { tenantId, role: 'manager', status: { $ne: 'suspended' } },
    '-password -agentKey -deviceFingerprints'
  ).sort({ name: 1 });

  res.json(new ApiResponse(200, 'Managers fetched.', managers));
});

export const getManager = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;

  const manager = await User.findOne(
    { _id: id, tenantId, role: 'manager' },
    '-password -agentKey -deviceFingerprints'
  );

  if (!manager) {
    throw new ApiError(404, 'Manager not found.');
  }

  res.json(new ApiResponse(200, 'Manager fetched.', manager));
});

export const createManager = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const { name, email, password, department, designation, phone } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'name, email and password are required.');
  }

  const existing = await User.findOne({ email: email.toLowerCase(), tenantId });
  if (existing) {
    throw new ApiError(409, 'A user with this email already exists.');
  }

  const manager = await User.create({
    tenantId,
    name,
    email: email.toLowerCase(),
    password,
    role: 'manager',
    department: department || '',
    designation: designation || 'Manager',
    phone: phone || '',
    status: 'active',
  });

  const { password: _pw, ...safeData } = (manager as any).toObject();
  res.status(201).json(new ApiResponse(201, 'Manager created.', safeData));
});

export const updateManager = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;
  const { name, email, department, designation, phone, status } = req.body;

  const manager = await User.findOneAndUpdate(
    { _id: id, tenantId, role: 'manager' },
    { $set: { name, email, department, designation, phone, status } },
    { new: true, runValidators: true, select: '-password -agentKey' }
  );

  if (!manager) {
    throw new ApiError(404, 'Manager not found.');
  }

  res.json(new ApiResponse(200, 'Manager updated.', manager));
});

export const deleteManager = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;

  const manager = await User.findOneAndDelete({ _id: id, tenantId, role: 'manager' });
  if (!manager) {
    throw new ApiError(404, 'Manager not found.');
  }

  res.json(new ApiResponse(200, 'Manager deleted.'));
});

export const assignTeam = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const { managerId, employeeIds } = req.body;

  if (!managerId || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw new ApiError(400, 'managerId and employeeIds[] are required.');
  }

  const manager = await User.findOne({ _id: managerId, tenantId, role: 'manager' });
  if (!manager) {
    throw new ApiError(404, 'Manager not found.');
  }

  const result = await User.updateMany(
    { _id: { $in: employeeIds }, tenantId, role: 'employee' } as any,
    { $set: { managerId } } as any
  );

  res.json(
    new ApiResponse(200, `${result.modifiedCount} employee(s) assigned to manager.`, {
      managerId,
      assignedCount: result.modifiedCount,
    })
  );
});

export const getManagerTeam = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;

  const manager = await User.findOne({ _id: id, tenantId, role: 'manager' }, 'name email department');
  if (!manager) {
    throw new ApiError(404, 'Manager not found.');
  }

  const teamFilter: Record<string, unknown> = { tenantId, role: 'employee', managerId: id };
  const team = await User.find(teamFilter as any, '-password -agentKey -deviceFingerprints').sort({ name: 1 });

  res.json(new ApiResponse(200, 'Team fetched.', { manager, team, count: team.length }));
});

export const getManagerDashboard = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const managerId = req.user?._id;

  if (!tenantId || !managerId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const tenantObjId = new mongoose.Types.ObjectId(String(tenantId));
  const today = formatDate(new Date());

  const teamFilter: Record<string, unknown> = { tenantId: tenantObjId, managerId: managerId.toString(), role: 'employee' };
  const teamMembers = await User.find(
    teamFilter as any,
    '_id name email department isOnline lastActive'
  );

  const teamIds = teamMembers.map((m) => m._id);

  const [presentToday, lateToday, totalScreenshots, onlineNow, recentScreenshots] =
    await Promise.all([
      Attendance.countDocuments({
        tenantId: tenantObjId,
        userId: { $in: teamIds },
        date: today,
        status: 'present',
      }),
      Attendance.countDocuments({
        tenantId: tenantObjId,
        userId: { $in: teamIds },
        date: today,
        status: 'late',
      }),
      Screenshot.countDocuments({
        tenantId: tenantObjId,
        userId: { $in: teamIds },
        timestamp: { $gte: new Date(today) },
      }),
      User.countDocuments({
        _id: { $in: teamIds },
        isOnline: true,
        lastActive: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      }),
      Screenshot.find({ tenantId: tenantObjId, userId: { $in: teamIds } })
        .populate('userId', 'name email avatar')
        .sort({ timestamp: -1 })
        .limit(6),
    ]);

  const productivityBreakdown = await ActivityLog.aggregate([
    {
      $match: {
        tenantId: tenantObjId,
        userId: { $in: teamIds },
        startTime: { $gte: new Date(today) },
      },
    },
    { $group: { _id: '$category', totalMinutes: { $sum: '$durationMinutes' } } },
  ]);

  res.json(
    new ApiResponse(200, 'Manager dashboard fetched.', {
      teamSize: teamMembers.length,
      stats: {
        presentToday,
        lateToday,
        absentToday: teamMembers.length - presentToday - lateToday,
        onlineNow,
        totalScreenshots,
      },
      productivityBreakdown,
      recentScreenshots,
      teamMembers,
    })
  );
});
