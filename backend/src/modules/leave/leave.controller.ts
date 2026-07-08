import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Leave } from './leave.model';
import { Attendance } from '../attendance/attendance.model';
import { User } from '../employee/employee.model';
import { LeavePolicy } from './leavePolicy.model';
import { createNotification } from '../../utils/notification';
import { paginate } from '../../utils/helpers';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { logger } from '../../utils/logger';

export const applyLeave = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user;
  if (!user || !user.tenantId || !user._id) {
    throw new ApiError(401, 'Unauthorized');
  }
  const tenantId = user.tenantId;
  const userId = user._id;

  const { leaveType, startDate, endDate, reason } = req.body;

  // Check policy limits
  const policy = await LeavePolicy.findOne({ tenantId }).lean();
  const limitKey = `${leaveType}LeavesPerYear` as 'casualLeavesPerYear' | 'sickLeavesPerYear' | 'paidLeavesPerYear';
  const limit = policy ? policy[limitKey] : undefined;

  if (limit !== undefined) {
    const currentYear = new Date().getFullYear();
    const usedThisYear = await Leave.countDocuments({
      userId,
      tenantId,
      leaveType,
      status: 'approved',
      startDate: { $gte: new Date(currentYear, 0, 1) },
    });

    if (usedThisYear >= limit) {
      throw new ApiError(400, `${leaveType} leave limit (${limit}) exhausted for this year.`);
    }
  }

  const leave = await Leave.create({
    tenantId,
    userId,
    leaveType,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    reason,
    status: 'pending',
  });

  // Notify managers and admins
  const managers = await User.find({ tenantId, role: { $in: ['manager', 'company_admin'] } }).lean();
  const startDateStr = new Date(startDate).toISOString().split('T')[0];
  const endDateStr = new Date(endDate).toISOString().split('T')[0];

  for (const mgr of managers) {
    createNotification(req.app, {
      tenantId,
      userId: mgr._id as mongoose.Types.ObjectId,
      type: 'system',
      title: 'New Leave Application',
      message: `${user.name} applied for ${leaveType} leave from ${startDateStr} to ${endDateStr}.`,
      link: '/leaves',
    }).catch((err) => logger.error('Failed to notify manager of new leave application:', err));
  }

  res.status(201).json(new ApiResponse(201, 'Leave application submitted successfully.', leave));
});

export const myLeaves = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user;
  if (!user || !user.tenantId || !user._id) {
    throw new ApiError(401, 'Unauthorized');
  }
  const userId = user._id;
  const tenantId = user.tenantId;
  const { page = 1, limit = 20 } = req.query as any;
  const { skip, limit: lim } = paginate(Number(page), Number(limit));

  const [leaves, total] = await Promise.all([
    Leave.find({ userId, tenantId }).skip(skip).limit(lim).sort({ createdAt: -1 }).lean(),
    Leave.countDocuments({ userId, tenantId }),
  ]);

  res.json(
    new ApiResponse(200, 'My leaves fetched successfully.', {
      leaves,
      pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
    })
  );
});

export const listLeaves = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user;
  if (!user || !user.tenantId) {
    throw new ApiError(401, 'Unauthorized');
  }
  const tenantId = user.tenantId;
  const { page = 1, limit = 20, status, userId } = req.query as any;
  const { skip, limit: lim } = paginate(Number(page), Number(limit));

  const filter: Record<string, any> = { tenantId };
  if (status) filter.status = status;
  if (userId) filter.userId = userId;

  const [leaves, total] = await Promise.all([
    Leave.find(filter)
      .populate('userId', 'name email department designation')
      .skip(skip)
      .limit(lim)
      .sort({ createdAt: -1 })
      .lean(),
    Leave.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, 'Leaves listed successfully.', {
      leaves,
      pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
    })
  );
});

export const updateLeave = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user;
  if (!user || !user.tenantId || !user._id) {
    throw new ApiError(401, 'Unauthorized');
  }
  const { id } = req.params;
  const tenantId = user.tenantId;
  const userId = user._id;
  const userRole = user.role;

  const leave = await Leave.findOne({ _id: id, tenantId });
  if (!leave) {
    throw new ApiError(404, 'Leave request not found.');
  }

  if (userRole === 'employee') {
    if (leave.userId.toString() !== userId?.toString()) {
      throw new ApiError(403, 'Unauthorized.');
    }
    if (leave.status !== 'pending') {
      throw new ApiError(400, 'You can only update pending leave requests.');
    }

    const { leaveType, startDate, endDate, reason } = req.body;
    if (leaveType) leave.leaveType = leaveType;
    if (startDate) leave.startDate = new Date(startDate);
    if (endDate) leave.endDate = new Date(endDate);
    if (reason) leave.reason = reason;

    await leave.save();
    res.json(new ApiResponse(200, 'Leave application updated successfully.', leave));
  } else {
    // Admin/Manager approving or rejecting
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      throw new ApiError(400, 'Invalid status. Choose approved or rejected.');
    }

    leave.status = status;
    leave.approvedBy = userId as mongoose.Types.ObjectId;
    await leave.save();

    // Notify the employee
    const startDateStr = leave.startDate.toISOString().split('T')[0];
    const endDateStr = leave.endDate.toISOString().split('T')[0];
    createNotification(req.app, {
      tenantId: leave.tenantId,
      userId: leave.userId,
      type: 'system',
      title: `Leave Application ${status.toUpperCase()}`,
      message: `Your leave request from ${startDateStr} to ${endDateStr} has been ${status} by ${req.user?.name}.`,
    }).catch((err) => logger.error('Failed to notify employee of leave status change:', err));

    // If approved, create or update Attendance records
    if (status === 'approved') {
      const curr = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      while (curr <= end) {
        const dateStr = curr.toISOString().split('T')[0];
        await Attendance.findOneAndUpdate(
          { userId: leave.userId, date: dateStr, tenantId: leave.tenantId },
          { $set: { status: 'on-leave' } },
          { upsert: true, new: true }
        );
        curr.setDate(curr.getDate() + 1);
      }
    }

    res.json(new ApiResponse(200, `Leave application ${status} successfully.`, leave));
  }
});

export const cancelLeave = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user;
  if (!user || !user.tenantId || !user._id) {
    throw new ApiError(401, 'Unauthorized');
  }
  const { id } = req.params;
  const tenantId = user.tenantId;
  const userId = user._id;

  const leave = await Leave.findOne({ _id: id, tenantId });
  if (!leave) {
    throw new ApiError(404, 'Leave request not found.');
  }

  // Ownership check
  if (leave.userId.toString() !== userId?.toString() && !['manager', 'company_admin'].includes(req.user?.role || '')) {
    throw new ApiError(403, 'Unauthorized to cancel this leave.');
  }

  const oldStatus = leave.status;
  leave.status = 'cancelled';
  await leave.save();

  // Revert attendance if the leave was previously approved
  if (oldStatus === 'approved') {
    const curr = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      // Only delete placeholder leave records (no actual punchIn)
      await Attendance.deleteOne({
        userId: leave.userId,
        date: dateStr,
        tenantId: leave.tenantId,
        'punchIn.time': { $exists: false },
      });
      curr.setDate(curr.getDate() + 1);
    }
  }

  // Notify employee if manager cancelled it, or notify managers if employee cancelled an approved leave
  if (leave.userId.toString() !== userId.toString()) {
    createNotification(req.app, {
      tenantId: leave.tenantId,
      userId: leave.userId,
      type: 'system',
      title: 'Leave Cancelled',
      message: `Your leave request has been cancelled by ${user.name}.`,
    }).catch((err) => logger.error('Failed to notify employee of leave cancellation:', err));
  } else if (oldStatus === 'approved') {
    const managers = await User.find({ tenantId: leave.tenantId, role: { $in: ['manager', 'company_admin'] } })
      .lean();
    for (const mgr of managers) {
      createNotification(req.app, {
        tenantId: leave.tenantId,
        userId: mgr._id as mongoose.Types.ObjectId,
        type: 'system',
        title: 'Leave Cancelled By Employee',
        message: `${user.name} has cancelled their approved leave starting ${
          leave.startDate.toISOString().split('T')[0]
        }.`,
      }).catch((err) => logger.error('Failed to notify manager of employee leave cancellation:', err));
    }
  }

  res.json(new ApiResponse(200, 'Leave cancelled successfully.', leave));
});
