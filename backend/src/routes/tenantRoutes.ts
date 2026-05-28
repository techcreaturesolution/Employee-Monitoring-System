import { Router } from 'express';
import { listTenants, getTenant, updateTenant, deleteTenant } from '../controllers/tenantController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('super_admin'));

router.get('/', listTenants);
router.get('/:id', getTenant);
router.put('/:id', updateTenant);
router.delete('/:id', deleteTenant);

export default router;
