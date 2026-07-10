import { Router } from 'express';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotificationEntry,
} from './notification.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createNotificationSchema, notificationQuerySchema } from './notification.validation';

const router = Router();

router.use(authenticate);

router.get('/', validate(notificationQuerySchema, 'query'), getMyNotifications);
router.post('/', authorize('company_admin', 'manager', 'super_admin', 'hr'), validate(createNotificationSchema), createNotificationEntry);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
