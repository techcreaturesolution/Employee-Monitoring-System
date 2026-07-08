import { Router } from 'express';
import { getMyNotifications, markAsRead, markAllAsRead, deleteNotification, createNotificationEntry } from '../controllers/notificationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getMyNotifications);
router.post('/', authorize('company_admin', 'manager', 'super_admin'), createNotificationEntry);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;

