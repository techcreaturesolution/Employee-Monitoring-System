import { Router } from 'express';
import { getHrDashboard } from './hr.controller';

const router = Router();

router.get('/', getHrDashboard);

export default router;
