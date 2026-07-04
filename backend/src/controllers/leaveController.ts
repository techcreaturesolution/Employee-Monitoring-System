import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Leave } from '../models/Leave';
import { Attendance } from '../models/Attendance';
import { User } from '../models/User';
import { createNotification } from '../utils/notification';
import { paginate } from '../utils/helpers';
import mongoose from 'mongoose';

export const applyLeave = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.tenantId || !user._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const tenantId = user.tenantId;
    const userId = user._id;

    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      res.status(400).json({ success: false, message: 'All fields (leaveType, startDate, endDate, reason) are required.' });
      return;
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
    const managers = await User.find({ tenantId, role: { $in: ['manager', 'company_admin'] } });
    const startDateStr = new Date(startDate).toISOString().split('T')[0];
    const endDateStr = new Date(endDate).toISOString().split('T')[0];

    for (const mgr of managers) {
      await createNotification(req.app, {
        tenantId,
        userId: mgr._id as mongoose.Types.ObjectId,
        type: 'system',
        title: 'New Leave Application',
        message: `${user.name} applied for ${leaveType} leave from ${startDateStr} to ${endDateStr}.`,
        link: '/leaves',
      });
    }

    res.status(201).json({ success: true, message: 'Leave application submitted successfully.', data: leave });
  } catch (error) {
    next(error);
  }
};

export const myLeaves = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.tenantId || !user._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const userId = user._id;
    const tenantId = user.tenantId;
    const { page = 1, limit = 20 } = req.query;
    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const [leaves, total] = await Promise.all([
      Leave.find({ userId, tenantId }).skip(skip).limit(lim).sort({ createdAt: -1 }),
      Leave.countDocuments({ userId, tenantId }),
    ]);

    res.json({
      success: true,
      data: {
        leaves,
        pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listLeaves = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.tenantId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const tenantId = user.tenantId;
    const { page = 1, limit = 20, status, userId } = req.query;
    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const filter: Record<string, any> = { tenantId };
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    const [leaves, total] = await Promise.all([
      Leave.find(filter).populate('userId', 'name email department designation').skip(skip).limit(lim).sort({ createdAt: -1 }),
      Leave.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        leaves,
        pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateLeave = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.tenantId || !user._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const { id } = req.params;
    const tenantId = user.tenantId;
    const userId = user._id;
    const userRole = user.role;

    const leave = await Leave.findOne({ _id: id, tenantId });
    if (!leave) {
      res.status(404).json({ success: false, message: 'Leave request not found.' });
      return;
    }

    if (userRole === 'employee') {
      if (leave.userId.toString() !== userId?.toString()) {
        res.status(403).json({ success: false, message: 'Unauthorized.' });
        return;
      }
      if (leave.status !== 'pending') {
        res.status(400).json({ success: false, message: 'You can only update pending leave requests.' });
        return;
      }

      const { leaveType, startDate, endDate, reason } = req.body;
      if (leaveType) leave.leaveType = leaveType;
      if (startDate) leave.startDate = new Date(startDate);
      if (endDate) leave.endDate = new Date(endDate);
      if (reason) leave.reason = reason;

      await leave.save();
      res.json({ success: true, message: 'Leave application updated successfully.', data: leave });
    } else {
      // Admin/Manager approving or rejecting
      const { status } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status. Choose approved or rejected.' });
        return;
      }

      leave.status = status;
      leave.approvedBy = userId as mongoose.Types.ObjectId;
      await leave.save();

      // Notify the employee
      const startDateStr = leave.startDate.toISOString().split('T')[0];
      const endDateStr = leave.endDate.toISOString().split('T')[0];
      await createNotification(req.app, {
        tenantId: leave.tenantId,
        userId: leave.userId,
        type: 'system',
        title: `Leave Application ${status.toUpperCase()}`,
        message: `Your leave request from ${startDateStr} to ${endDateStr} has been ${status} by ${req.user?.name}.`,
      });

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

      res.json({ success: true, message: `Leave application ${status} successfully.`, data: leave });
    }
  } catch (error) {
    next(error);
  }
};

export const cancelLeave = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.tenantId || !user._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const { id } = req.params;
    const tenantId = user.tenantId;
    const userId = user._id;

    const leave = await Leave.findOne({ _id: id, tenantId });
    if (!leave) {
      res.status(404).json({ success: false, message: 'Leave request not found.' });
      return;
    }

    // Ownership check
    if (leave.userId.toString() !== userId?.toString() && !['manager', 'company_admin'].includes(req.user?.role || '')) {
      res.status(403).json({ success: false, message: 'Unauthorized to cancel this leave.' });
      return;
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
          'punchIn.time': { $exists: false }
        });
        curr.setDate(curr.getDate() + 1);
      }
    }

    // Notify employee if manager cancelled it, or notify managers if employee cancelled an approved leave
    if (leave.userId.toString() !== userId.toString()) {
      await createNotification(req.app, {
        tenantId: leave.tenantId,
        userId: leave.userId,
        type: 'system',
        title: 'Leave Cancelled',
        message: `Your leave request has been cancelled by ${user.name}.`,
      });
    } else if (oldStatus === 'approved') {
      const managers = await User.find({ tenantId: leave.tenantId, role: { $in: ['manager', 'company_admin'] } });
      for (const mgr of managers) {
        await createNotification(req.app, {
          tenantId: leave.tenantId,
          userId: mgr._id as mongoose.Types.ObjectId,
          type: 'system',
          title: 'Leave Cancelled By Employee',
          message: `${user.name} has cancelled their approved leave starting ${leave.startDate.toISOString().split('T')[0]}.`,
        });
      }
    }

    res.json({ success: true, message: 'Leave cancelled successfully.', data: leave });
  } catch (error) {
    next(error);
  }
};
