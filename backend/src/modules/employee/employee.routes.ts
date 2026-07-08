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
} from './employee.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  addEmployeeSchema,
  updateEmployeeSchema,
  employeeQuerySchema,
} from './employee.validation';

const router = Router();

router.use(authenticate);

// Existing
router.get(
  '/',
  authorize('company_admin', 'manager', 'super_admin'),
  validate(employeeQuerySchema, 'query'),
  listEmployees
);
router.post(
  '/',
  authorize('company_admin', 'super_admin'),
  validate(addEmployeeSchema),
  addEmployee
);
router.get('/:id', authorize('company_admin', 'manager', 'super_admin'), getEmployee);
router.put(
  '/:id',
  authorize('company_admin', 'super_admin'),
  validate(updateEmployeeSchema),
  updateEmployee
);
router.delete('/:id', authorize('company_admin', 'super_admin'), deleteEmployee);
router.post('/:id/regenerate-key', authorize('company_admin', 'super_admin'), regenerateAgentKey);

// New
router.get('/view/statistics', authorize('company_admin', 'manager', 'super_admin'), getEmployeeStatistics);
router.get('/:id/activity', authorize('company_admin', 'manager', 'super_admin'), getEmployeeActivity);

export default router;
