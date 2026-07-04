import { Router } from 'express';
import { getMyNotifications, markAsRead, markAllAsRead, deleteNotification } from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getMyNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
