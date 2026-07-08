import { Router } from 'express';
import { getCompanyAnalytics } from '../controllers/companyController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/company/analytics
router.get('/analytics', authorize('company_admin', 'super_admin'), getCompanyAnalytics);

export default router;
