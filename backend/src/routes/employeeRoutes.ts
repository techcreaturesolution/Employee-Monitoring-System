import { Router } from 'express';
import {
  listEmployees,
  addEmployee,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  regenerateAgentKey,
  getEmployeeActivity,
  getEmployeeStatistics,
} from '../controllers/employeeController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Existing
router.get('/', authorize('company_admin', 'manager', 'super_admin'), listEmployees);
router.post('/', authorize('company_admin', 'super_admin'), addEmployee);
router.get('/:id', authorize('company_admin', 'manager', 'super_admin'), getEmployee);
router.put('/:id', authorize('company_admin', 'super_admin'), updateEmployee);
router.delete('/:id', authorize('company_admin', 'super_admin'), deleteEmployee);
router.post('/:id/regenerate-key', authorize('company_admin', 'super_admin'), regenerateAgentKey);

// New
router.get('/view/statistics', authorize('company_admin', 'manager', 'super_admin'), getEmployeeStatistics);
router.get('/:id/activity', authorize('company_admin', 'manager', 'super_admin'), getEmployeeActivity);

export default router;

