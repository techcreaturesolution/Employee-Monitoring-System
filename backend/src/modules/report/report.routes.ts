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
} from './report.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Existing
router.get('/attendance', authorize('company_admin', 'manager', 'super_admin', 'hr'), getAttendanceReport);
router.get('/productivity', authorize('company_admin', 'manager', 'super_admin'), getProductivityReport);
router.get('/activity', authorize('company_admin', 'manager', 'super_admin'), getActivityReport);
router.get('/screenshots', authorize('company_admin', 'manager', 'super_admin'), getScreenshotReport);
router.get('/export/excel', authorize('company_admin', 'manager', 'super_admin', 'hr'), exportExcel);
router.get('/export/pdf', authorize('company_admin', 'manager', 'super_admin', 'hr'), exportPDF);

// New
router.get('/employee', authorize('company_admin', 'manager', 'super_admin', 'hr'), getEmployeeReport);
router.get('/project', authorize('company_admin', 'manager', 'super_admin'), getProjectReport);
router.get('/task', authorize('company_admin', 'manager', 'super_admin'), getTaskReport);

export default router;
