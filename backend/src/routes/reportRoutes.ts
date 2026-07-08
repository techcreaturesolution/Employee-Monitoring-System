import { Router } from 'express';
import {
  getAttendanceReport,
  getProductivityReport,
  getActivityReport,
  getScreenshotReport,
  getEmployeeReport,
  getProjectReport,
  getTaskReport,
  exportExcel,
  exportPDF,
} from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('company_admin', 'manager', 'super_admin'));

// Existing
router.get('/attendance', getAttendanceReport);
router.get('/productivity', getProductivityReport);
router.get('/activity', getActivityReport);
router.get('/screenshots', getScreenshotReport);
router.get('/export/excel', exportExcel);
router.get('/export/pdf', exportPDF);

// New
router.get('/employee', getEmployeeReport);
router.get('/project', getProjectReport);
router.get('/task', getTaskReport);

export default router;

