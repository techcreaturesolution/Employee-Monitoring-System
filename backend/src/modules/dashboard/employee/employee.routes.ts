import { Router } from 'express';
import { getEmployeeDashboard } from './employee.controller';

const router = Router();

router.get('/', getEmployeeDashboard);

export default router;
