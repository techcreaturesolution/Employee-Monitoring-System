import { Router } from 'express';
import { getSuperAdminDashboard } from './superAdmin.controller';

const router = Router();

router.get('/', getSuperAdminDashboard);

export default router;
