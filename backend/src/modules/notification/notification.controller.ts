import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Notification } from './notification.model';
import { paginate } from '../../utils/helpers';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

export const getMyNotifications = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;
  const { page = 1, limit = 20 } = req.query as any;
  const { skip, limit: lim } = paginate(Number(page), Number(limit));

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userId, tenantId }).skip(skip).limit(lim).sort({ createdAt: -1 }).lean(),
    Notification.countDocuments({ userId, tenantId }),
    Notification.countDocuments({ userId, tenantId, read: false }),
  ]);

  res.json(
    new ApiResponse(200, 'My notifications fetched successfully.', {
      notifications,
      unreadCount,
      pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
    })
  );
});

export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;

  const notif = await Notification.findOneAndUpdate(
    { _id: id, userId, tenantId },
    { $set: { read: true } },
    { new: true }
  );

  if (!notif) {
    throw new ApiError(404, 'Notification not found.');
  }

  res.json(new ApiResponse(200, 'Notification marked as read.', notif));
});

export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;

  await Notification.updateMany(
    { userId, tenantId, read: false },
    { $set: { read: true } }
  );

  res.json(new ApiResponse(200, 'All notifications marked as read.'));
});

export const deleteNotification = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?._id;
  const tenantId = req.user?.tenantId;

  const notif = await Notification.findOneAndDelete({ _id: id, userId, tenantId });

  if (!notif) {
    throw new ApiError(404, 'Notification not found.');
  }

  res.json(new ApiResponse(200, 'Notification deleted successfully.'));
});

export const createNotificationEntry = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const { userId, title, message, type, link } = req.body;

  const notif = await Notification.create({
    userId,
    tenantId,
    title,
    message,
    type: type || 'system',
    link: link || '',
    read: false,
  });

  // Emit real-time notification via Socket.IO
  const io = req.app.get('io');
  if (io && userId) {
    io.to(userId.toString()).emit('new-notification', notif);
  }

  res.status(201).json(new ApiResponse(201, 'Notification created successfully.', notif));
});
