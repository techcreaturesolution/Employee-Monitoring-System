import { Router } from 'express';
import { getSettings, updateSettings } from './settings.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', authorize('company_admin', 'manager', 'super_admin'), getSettings);
router.put('/', authorize('company_admin', 'super_admin'), updateSettings);

export default router;
