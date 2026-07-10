import { Router } from 'express';
import { getPermissions, updatePermission } from './permission.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { updatePermissionSchema } from './permission.validation';

const router = Router();

router.use(authenticate);
router.use(authorize('company_admin', 'super_admin'));

router.get('/', getPermissions);
router.put('/', validate(updatePermissionSchema), updatePermission);

export default router;
