import { Router } from 'express';
import {
  getAttendanceReport,
  getProductivityReport,
  getActivityReport,
  getScreenshotReport,
  exportExcel,
  exportPDF,
} from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('company_admin', 'manager', 'super_admin'));

router.get('/attendance', getAttendanceReport);
router.get('/productivity', getProductivityReport);
router.get('/activity', getActivityReport);
router.get('/screenshots', getScreenshotReport);
router.get('/export/excel', exportExcel);
router.get('/export/pdf', exportPDF);

export default router;
