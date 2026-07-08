import { Router } from 'express';
import { applyLeave, myLeaves, listLeaves, updateLeave, cancelLeave } from './leave.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  applyLeaveSchema,
  updateLeaveSchema,
  leaveQuerySchema,
} from './leave.validation';

const router = Router();

router.use(authenticate);

router.post('/', validate(applyLeaveSchema), applyLeave);
router.get('/my', validate(leaveQuerySchema, 'query'), myLeaves);
router.get('/', authorize('company_admin', 'manager', 'super_admin'), validate(leaveQuerySchema, 'query'), listLeaves);
router.put('/:id', validate(updateLeaveSchema), updateLeave);
router.delete('/:id', cancelLeave);

export default router;
