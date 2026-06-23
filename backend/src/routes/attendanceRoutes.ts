import { Router } from 'express';
import {
  punchIn,
  punchOut,
  startBreak,
  endBreak,
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceReport,
} from '../controllers/attendanceController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/punch-in', punchIn);
router.post('/punch-out', punchOut);
router.post('/break/start', startBreak);
router.post('/break/end', endBreak);
router.get('/today', getTodayAttendance);
router.get('/history', getAttendanceHistory);
router.get('/report', authorize('company_admin', 'manager', 'super_admin'), getAttendanceReport);

export default router;
