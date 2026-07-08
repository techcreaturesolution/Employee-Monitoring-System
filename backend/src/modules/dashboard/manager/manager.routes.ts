import { Router } from 'express';
import { getManagerDashboard } from './manager.controller';

const router = Router();

router.get('/', getManagerDashboard);

export default router;
