import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import superAdminRoutes from './superAdmin/superAdmin.routes';
import companyRoutes from './company/company.routes';
import managerRoutes from './manager/manager.routes';
import hrRoutes from './hr/hr.routes';
import employeeRoutes from './employee/employee.routes';

const router = Router();

router.use('/super-admin', authenticate, authorize('super_admin'), superAdminRoutes);
router.use('/company', authenticate, authorize('company_admin', 'super_admin', 'manager', 'hr'), companyRoutes);
router.use('/hr', authenticate, authorize('hr'), hrRoutes);
router.use('/manager', authenticate, authorize('manager', 'company_admin'), managerRoutes);
router.use('/employee', authenticate, employeeRoutes); // any authenticated user sees their own dashboard

export default router;
