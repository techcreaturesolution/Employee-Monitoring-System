import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Notification } from '../models/Notification';
import { paginate } from '../utils/helpers';

export const getMyNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const { page = 1, limit = 20 } = req.query;
    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId, tenantId }).skip(skip).limit(lim).sort({ createdAt: -1 }),
      Notification.countDocuments({ userId, tenantId }),
      Notification.countDocuments({ userId, tenantId, read: false }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;

    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId, tenantId },
      { $set: { read: true } },
      { new: true }
    );

    if (!notif) {
      res.status(404).json({ success: false, message: 'Notification not found.' });
      return;
    }

    res.json({ success: true, message: 'Notification marked as read.', data: notif });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;

    await Notification.updateMany(
      { userId, tenantId, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;

    const notif = await Notification.findOneAndDelete({ _id: id, userId, tenantId });

    if (!notif) {
      res.status(404).json({ success: false, message: 'Notification not found.' });
      return;
    }

    res.json({ success: true, message: 'Notification deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
