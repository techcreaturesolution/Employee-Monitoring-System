import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/audit-logs
router.get('/', authorize('company_admin', 'super_admin'), getAuditLogs);

export default router;
