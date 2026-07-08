import { Router } from 'express';
import {
  logActivity,
  getActivityLogs,
  getActivitySummary,
  getKeyboardActivity,
  getMouseActivity,
  getIdleActivity,
  getActivityTimeline,
  getActivityProductivity,
  getAppUsage,
  getWebsiteUsage,
} from './activity.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Existing
router.post('/log', logActivity);
router.get('/', getActivityLogs);
router.get('/summary', getActivitySummary);

// New: detailed breakdowns
router.get('/keyboard', getKeyboardActivity);
router.get('/mouse', getMouseActivity);
router.get('/idle', getIdleActivity);
router.get('/timeline', getActivityTimeline);
router.get('/productivity', getActivityProductivity);

// App & Website tracking
router.get('/apps', getAppUsage);
router.get('/websites', getWebsiteUsage);

export default router;
