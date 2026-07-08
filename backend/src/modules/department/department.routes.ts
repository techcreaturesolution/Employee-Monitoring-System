import { Router } from 'express';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from './department.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createDepartmentSchema, updateDepartmentSchema } from './department.validation';

const router = Router();

router.use(authenticate);

router.get('/', listDepartments);
router.post('/', authorize('company_admin', 'super_admin'), validate(createDepartmentSchema), createDepartment);
router.put('/:id', authorize('company_admin', 'super_admin'), validate(updateDepartmentSchema), updateDepartment);
router.delete('/:id', authorize('company_admin', 'super_admin'), deleteDepartment);

export default router;
