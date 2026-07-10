import { Response } from 'express';
import { User } from './employee.model';
import { AuthRequest } from '../../middleware/auth';
import { generateAgentKey, paginate, formatDate } from '../../utils/helpers';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { ActivityLog } from '../activity/activity.model';
import { Attendance } from '../attendance/attendance.model';
import { Screenshot } from '../screenshot/screenshot.model';
import mongoose from 'mongoose';
import { cache } from '../../services/cache';
import { sendEmail } from '../../services/email.service';
import { employeeInviteTemplate, emailChangeVerificationTemplate, oldEmailSecurityAlertTemplate, profileUpdatedTemplate } from '../../services/emailTemplates';
import { config } from '../../config';
import { resolveTenantScope } from '../../utils/resolveTenantScope';

export const listEmployees = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = resolveTenantScope(req);
  const { page = 1, limit = 20, status, department, search } = req.query as any;
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

  res.json(
    new ApiResponse(200, 'Employees listed successfully.', {
      employees,
      pagination: {
        total,
        page: Number(page),
        limit: lim,
        pages: Math.ceil(total / lim),
      },
    })
  );
});

export const addEmployee = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = resolveTenantScope(req);
  const { name, email, password, role, department, designation, employeeId, phone } = req.body;

  const existing = await User.findOne({ email, tenantId });
  if (existing) {
    throw new ApiError(409, 'Employee with this email already exists.');
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

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  await cache.set(`email_verify:${hashedToken}`, String(employee._id), 24 * 60 * 60);

  const verifyLink = `${config.frontendUrl}/verify-email?token=${rawToken}`;

  sendEmail({
    to: employee.email,
    subject: 'You have been added to EMS - Verify Your Email',
    html: employeeInviteTemplate(employee.name, finalPassword, verifyLink),
  }).catch((err: any) => logger.error('Failed to send employee invite email:', err));

  res.status(201).json(new ApiResponse(201, 'Employee added successfully.', responseData));
});

export const getEmployee = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = resolveTenantScope(req);

  const employee = await User.findOne({ _id: id, tenantId });
  if (!employee) {
    throw new ApiError(404, 'Employee not found.');
  }

  res.json(new ApiResponse(200, 'Employee details fetched.', employee));
});

export const updateEmployee = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = resolveTenantScope(req);

  const existingEmployee = await User.findOne({ _id: id, tenantId });
  if (!existingEmployee) {
    throw new ApiError(404, 'Employee not found.');
  }

  const allowedUpdates = ['name', 'department', 'designation', 'phone', 'status', 'role', 'employeeId', 'workMode'];
  const updates: Record<string, unknown> = {};
  const changedFields: string[] = [];

  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined && req.body[key] !== (existingEmployee as any)[key]) {
      updates[key] = req.body[key];
      changedFields.push(key);
    }
  }

  if (req.body.email && req.body.email !== existingEmployee.email) {
    const emailExists = await User.findOne({ email: req.body.email });
    if (emailExists) {
      throw new ApiError(409, 'Email is already in use by another user.');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    updates['pendingEmail'] = req.body.email;
    updates['emailVerificationTokenHash'] = hashedToken;
    updates['emailVerificationExpiry'] = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const verifyLink = `${config.frontendUrl}/verify-email-change?token=${rawToken}`;
    
    sendEmail({
      to: req.body.email,
      subject: 'Confirm your new email address',
      html: emailChangeVerificationTemplate(existingEmployee.name, verifyLink),
    }).catch(err => logger.error('Failed to send email change verification:', err));

    sendEmail({
      to: existingEmployee.email,
      subject: 'Security Alert: Email Change Requested',
      html: oldEmailSecurityAlertTemplate(existingEmployee.name),
    }).catch(err => logger.error('Failed to send old email security alert:', err));
  }

  const employee = await User.findOneAndUpdate(
    { _id: id, tenantId },
    updates,
    { new: true }
  );

  if (changedFields.length > 0 && employee) {
    sendEmail({
      to: employee.email,
      subject: 'Your EMS profile was updated',
      html: profileUpdatedTemplate(employee.name, changedFields),
    }).catch(err => logger.error('Failed to send profile-update email:', err));
  }

  await cache.delete(`user:${employee?._id}`);

  res.json(new ApiResponse(200, 'Employee updated.', employee));
});

export const deleteEmployee = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = resolveTenantScope(req);

  const employee = await User.findOneAndUpdate(
    { _id: id, tenantId },
    { status: 'inactive' },
    { new: true }
  );

  if (!employee) {
    throw new ApiError(404, 'Employee not found.');
  }

  await cache.delete(`user:${employee._id}`);

  res.json(new ApiResponse(200, 'Employee deactivated.'));
});

export const regenerateAgentKey = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = resolveTenantScope(req);
  const newKey = generateAgentKey();

  const employee = await User.findOneAndUpdate(
    { _id: id, tenantId },
    { agentKey: newKey },
    { new: true }
  );

  if (!employee) {
    throw new ApiError(404, 'Employee not found.');
  }

  await cache.delete(`user:${employee._id}`);

  res.json(new ApiResponse(200, 'Agent key regenerated.', { agentKey: newKey }));
});

export const getEmployeeActivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = resolveTenantScope(req);
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

  res.json(
    new ApiResponse(200, 'Employee activity fetched.', {
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
    })
  );
});

export const getEmployeeStatistics = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = resolveTenantScope(req);
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

  res.json(new ApiResponse(200, 'Employee statistics fetched.', stats));
});
