import { Router } from 'express';
import { getAdminDashboard, getEmployeeDashboard } from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/admin', authorize('company_admin', 'manager', 'super_admin'), getAdminDashboard);
router.get('/employee', getEmployeeDashboard);

export default router;
