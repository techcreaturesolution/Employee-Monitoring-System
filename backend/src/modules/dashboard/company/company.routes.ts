import { Router } from 'express';
import { getCompanyDashboard } from './company.controller';

const router = Router();

router.get('/', getCompanyDashboard);

export default router;
