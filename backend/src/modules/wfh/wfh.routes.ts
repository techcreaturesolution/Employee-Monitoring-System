import { Router } from 'express';
import { applyWFH, getMyWFH, listWFH, updateWFH } from './wfh.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { applyWFHSchema, updateWFHSchema, wfhQuerySchema } from './wfh.validation';

const router = Router();

router.use(authenticate);

router.post('/', validate(applyWFHSchema), applyWFH);
router.get('/my', validate(wfhQuerySchema, 'query'), getMyWFH);
router.get('/', authorize('company_admin', 'manager', 'super_admin', 'hr'), validate(wfhQuerySchema, 'query'), listWFH);
router.put('/:id', authorize('company_admin', 'manager', 'super_admin', 'hr'), validate(updateWFHSchema), updateWFH);

export default router;
