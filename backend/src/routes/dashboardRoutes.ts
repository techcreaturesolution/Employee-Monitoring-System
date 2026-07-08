import { Router } from 'express';
import { getAdminDashboard, getEmployeeDashboard, getSuperAdminDashboard } from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Legacy route (kept for backwards compat)
router.get('/admin', authorize('company_admin', 'manager', 'super_admin'), getAdminDashboard);
router.get('/employee', getEmployeeDashboard);

// New named routes
router.get('/company', authorize('company_admin', 'super_admin'), getAdminDashboard);
router.get('/manager', authorize('company_admin', 'manager', 'super_admin'), getAdminDashboard);
router.get('/super-admin', authorize('super_admin'), getSuperAdminDashboard);

export default router;
