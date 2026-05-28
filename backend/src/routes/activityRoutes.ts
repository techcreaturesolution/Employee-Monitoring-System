import { Router } from 'express';
import { logActivity, getActivityLogs, getActivitySummary } from '../controllers/activityController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/log', logActivity);
router.get('/', getActivityLogs);
router.get('/summary', getActivitySummary);

export default router;
