import { Router } from 'express';
import {
  punchIn,
  punchOut,
  startBreak,
  endBreak,
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceReport,
} from './attendance.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  punchInSchema,
  punchOutSchema,
  startBreakSchema,
  attendanceQuerySchema,
} from './attendance.validation';

const router = Router();

router.use(authenticate);

router.post('/punch-in', validate(punchInSchema), punchIn);
router.post('/punch-out', validate(punchOutSchema), punchOut);
router.post('/break/start', validate(startBreakSchema), startBreak);
router.post('/break/end', endBreak);
router.get('/today', getTodayAttendance);
router.get('/history', validate(attendanceQuerySchema, 'query'), getAttendanceHistory);
router.get('/report', authorize('company_admin', 'manager', 'super_admin', 'hr'), getAttendanceReport);

export default router;
