import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { generateAgentKey, paginate } from '../utils/helpers';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const listEmployees = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { page = 1, limit = 20, status, department, search } = req.query;
    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const filter: Record<string, unknown> = { tenantId };
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const [employees, total] = await Promise.all([
      User.find(filter).skip(skip).limit(lim).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          total,
          page: Number(page),
          limit: lim,
          pages: Math.ceil(total / lim),
        },
      },
    });
  } catch (error) {
    logger.error('listEmployees failed:', error);
    next(error);
  }
};

const addEmployee = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { name, email, password, role, department, designation, employeeId, phone } = req.body;

    const existing = await User.findOne({ email, tenantId });
    if (existing) {
      res.status(409).json({ success: false, message: 'Employee with this email already exists.' });
      return;
    }

    const tempPassword = crypto.randomBytes(12).toString('base64url');
    const finalPassword = password || tempPassword;

    const employee = await User.create({
      name,
      email,
      password: finalPassword,
      mustChangePassword: !password, // force change on first login if no password provided
      role: role || 'employee',
      tenantId,
      department: department || '',
      designation: designation || '',
      employeeId: employeeId || '',
      phone: phone || '',
      agentKey: generateAgentKey(),
    });

    const responseData: any = {
      id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      designation: employee.designation,
      agentKey: employee.agentKey,
    };

    if (!password) {
      responseData.tempPassword = tempPassword; // Send it back to the client once
    }

    res.status(201).json({
      success: true,
      message: 'Employee added successfully.',
      data: responseData,
    });
  } catch (error) {
    logger.error('addEmployee failed:', error);
    next(error);
  }
};

const getEmployee = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const employee = await User.findOne({ _id: id, tenantId });
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    logger.error('getEmployee failed:', error);
    next(error);
  }
};

const updateEmployee = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const allowedUpdates = ['name', 'department', 'designation', 'phone', 'status', 'role', 'employeeId', 'workMode'];
    const updates: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const employee = await User.findOneAndUpdate(
      { _id: id, tenantId },
      updates,
      { new: true }
    );

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    res.json({ success: true, message: 'Employee updated.', data: employee });
  } catch (error) {
    logger.error('updateEmployee failed:', error);
    next(error);
  }
};

const deleteEmployee = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const employee = await User.findOneAndUpdate(
      { _id: id, tenantId },
      { status: 'inactive' },
      { new: true }
    );

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    res.json({ success: true, message: 'Employee deactivated.' });
  } catch (error) {
    logger.error('deleteEmployee failed:', error);
    next(error);
  }
};

const regenerateAgentKey = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const newKey = generateAgentKey();

    const employee = await User.findOneAndUpdate(
      { _id: id, tenantId },
      { agentKey: newKey },
      { new: true }
    );

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    res.json({ success: true, message: 'Agent key regenerated.', data: { agentKey: newKey } });
  } catch (error) {
    logger.error('regenerateAgentKey failed:', error);
    next(error);
  }
};

export {
  listEmployees,
  addEmployee,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  regenerateAgentKey,
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employees/:id/activity
// Full activity log for a specific employee
// ─────────────────────────────────────────────────────────────────────────────
import { ActivityLog } from '../models/ActivityLog';
import { Attendance } from '../models/Attendance';
import { Screenshot } from '../models/Screenshot';
import mongoose from 'mongoose';
import { formatDate } from '../utils/helpers';

export const getEmployeeActivity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const { startDate, endDate, date } = req.query as Record<string, string>;

    const targetDate = date || startDate || formatDate(new Date());
    const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const userId = new mongoose.Types.ObjectId(id);
    const tenantObjId = new mongoose.Types.ObjectId(String(tenantId));

    const [activityLogs, attendance, screenshots] = await Promise.all([
      ActivityLog.find({
        userId,
        tenantId: tenantObjId,
        startTime: { $gte: start, $lte: end },
      }).sort({ startTime: 1 }),

      Attendance.findOne({
        userId,
        tenantId: tenantObjId,
        date: targetDate,
      }),

      Screenshot.find({
        userId,
        tenantId: tenantObjId,
        timestamp: { $gte: start, $lte: end },
      }).sort({ timestamp: 1 }).limit(50),
    ]);

    const productiveMinutes = activityLogs
      .filter((l) => l.category === 'productive')
      .reduce((s, l) => s + l.durationMinutes, 0);
    const totalMinutes = activityLogs.reduce((s, l) => s + l.durationMinutes, 0);

    res.json({
      success: true,
      data: {
        date: targetDate,
        attendance,
        activityLogs,
        screenshots,
        summary: {
          totalMinutes,
          productiveMinutes,
          productivityScore: totalMinutes > 0 ? Math.round((productiveMinutes / totalMinutes) * 100) : 0,
          screenshotCount: screenshots.length,
        },
      },
    });
  } catch (error) {
    logger.error('getEmployeeActivity failed:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employees/statistics
// Aggregate stats per employee for admin/manager views
// ─────────────────────────────────────────────────────────────────────────────
export const getEmployeeStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const tenantObjId = new mongoose.Types.ObjectId(String(tenantId));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await ActivityLog.aggregate([
      {
        $match: {
          tenantId: tenantObjId,
          startTime: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: { userId: '$userId', category: '$category' },
          totalMinutes: { $sum: '$durationMinutes' },
        },
      },
      {
        $group: {
          _id: '$_id.userId',
          productive:   { $sum: { $cond: [{ $eq: ['$_id.category', 'productive']   }, '$totalMinutes', 0] } },
          neutral:      { $sum: { $cond: [{ $eq: ['$_id.category', 'neutral']      }, '$totalMinutes', 0] } },
          unproductive: { $sum: { $cond: [{ $eq: ['$_id.category', 'unproductive'] }, '$totalMinutes', 0] } },
        },
      },
      {
        $addFields: {
          total: { $add: ['$productive', '$neutral', '$unproductive'] },
          productivityScore: {
            $cond: [
              { $gt: [{ $add: ['$productive', '$neutral', '$unproductive'] }, 0] },
              { $round: [{ $multiply: [{ $divide: ['$productive', { $add: ['$productive', '$neutral', '$unproductive'] }] }, 100] }, 1] },
              0,
            ],
          },
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
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: '$user.name',
          email: '$user.email',
          department: '$user.department',
          designation: '$user.designation',
          employeeId: '$user.employeeId',
          isOnline: '$user.isOnline',
          status: '$user.status',
          productive: 1,
          neutral: 1,
          unproductive: 1,
          total: 1,
          productivityScore: 1,
        },
      },
      { $sort: { productivityScore: -1 } },
    ]);

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('getEmployeeStatistics failed:', error);
    next(error);
  }
};

