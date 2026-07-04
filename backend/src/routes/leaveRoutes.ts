import { Router } from 'express';
import { applyLeave, myLeaves, listLeaves, updateLeave, cancelLeave } from '../controllers/leaveController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', applyLeave);
router.get('/my', myLeaves);
router.get('/', authorize('company_admin', 'manager', 'super_admin'), listLeaves);
router.put('/:id', updateLeave);
router.delete('/:id', cancelLeave);

export default router;
