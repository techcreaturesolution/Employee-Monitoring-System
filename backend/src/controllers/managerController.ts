import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Attendance } from '../models/Attendance';
import { ActivityLog } from '../models/ActivityLog';
import { Screenshot } from '../models/Screenshot';
import { Notification } from '../models/Notification';
import { logger } from '../utils/logger';
import { formatDate } from '../utils/helpers';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/managers
// List all managers within the tenant
// ─────────────────────────────────────────────────────────────────────────────
export const listManagers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const managers = await User.find(
      { tenantId, role: 'manager', status: { $ne: 'suspended' } },
      '-password -agentKey -deviceFingerprints'
    ).sort({ name: 1 });

    res.json({ success: true, data: managers });
  } catch (error) {
    logger.error('listManagers failed:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/managers/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getManager = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const manager = await User.findOne(
      { _id: id, tenantId, role: 'manager' },
      '-password -agentKey -deviceFingerprints'
    );

    if (!manager) {
      res.status(404).json({ success: false, message: 'Manager not found.' });
      return;
    }

    res.json({ success: true, data: manager });
  } catch (error) {
    logger.error('getManager failed:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/managers
// Create a manager account
// ─────────────────────────────────────────────────────────────────────────────
export const createManager = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { name, email, password, department, designation, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'name, email and password are required.' });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase(), tenantId });
    if (existing) {
      res.status(409).json({ success: false, message: 'A user with this email already exists.' });
      return;
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
    res.status(201).json({ success: true, message: 'Manager created.', data: safeData });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ success: false, message: 'Email already in use.' });
      return;
    }
    logger.error('createManager failed:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/managers/:id
// ─────────────────────────────────────────────────────────────────────────────
export const updateManager = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const { name, email, department, designation, phone, status } = req.body;

    const manager = await User.findOneAndUpdate(
      { _id: id, tenantId, role: 'manager' },
      { $set: { name, email, department, designation, phone, status } },
      { new: true, runValidators: true, select: '-password -agentKey' }
    );

    if (!manager) {
      res.status(404).json({ success: false, message: 'Manager not found.' });
      return;
    }

    res.json({ success: true, message: 'Manager updated.', data: manager });
  } catch (error) {
    logger.error('updateManager failed:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/managers/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteManager = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const manager = await User.findOneAndDelete({ _id: id, tenantId, role: 'manager' });
    if (!manager) {
      res.status(404).json({ success: false, message: 'Manager not found.' });
      return;
    }

    res.json({ success: true, message: 'Manager deleted.' });
  } catch (error) {
    logger.error('deleteManager failed:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/managers/assign-team
// Assign employees to a manager (stored in employee's managerId field via department)
// ─────────────────────────────────────────────────────────────────────────────
export const assignTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { managerId, employeeIds } = req.body;

    if (!managerId || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      res.status(400).json({ success: false, message: 'managerId and employeeIds[] are required.' });
      return;
    }

    const manager = await User.findOne({ _id: managerId, tenantId, role: 'manager' });
    if (!manager) {
      res.status(404).json({ success: false, message: 'Manager not found.' });
      return;
    }

    // Store managerId as a custom field on employees
    const result = await User.updateMany(
      { _id: { $in: employeeIds }, tenantId, role: 'employee' } as any,
      { $set: { managerId } } as any
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} employee(s) assigned to manager.`,
      data: { managerId, assignedCount: result.modifiedCount },
    });
  } catch (error) {
    logger.error('assignTeam failed:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/managers/team/:id
// Get all employees under a manager
// ─────────────────────────────────────────────────────────────────────────────
export const getManagerTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const manager = await User.findOne({ _id: id, tenantId, role: 'manager' }, 'name email department');
    if (!manager) {
      res.status(404).json({ success: false, message: 'Manager not found.' });
      return;
    }

    const teamFilter: Record<string, unknown> = { tenantId, role: 'employee', managerId: id };
    const team = await User.find(teamFilter as any, '-password -agentKey -deviceFingerprints').sort({ name: 1 });

    res.json({ success: true, data: { manager, team, count: team.length } });
  } catch (error) {
    logger.error('getManagerTeam failed:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/managers/dashboard
// Manager-specific dashboard stats for their team
// ─────────────────────────────────────────────────────────────────────────────
export const getManagerDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const managerId = req.user?._id;

    if (!tenantId || !managerId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const tenantObjId = new mongoose.Types.ObjectId(String(tenantId));
    const today = formatDate(new Date());

    // Find team members under this manager
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

    res.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    logger.error('getManagerDashboard failed:', error);
    next(error);
  }
};
