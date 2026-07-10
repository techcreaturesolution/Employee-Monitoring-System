import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import {
  getProductivityStats,
  getProductivityRange,
  getProductivityOverview,
  getProductivitySummary,
  getEmployeeProductivity,
  listKeywords,
  createKeyword,
  updateKeyword,
  deleteKeyword,
} from './productivity.controller';

const router = Router();

// ── Productivity stats (all authenticated users) ─────────────────────────────
router.get('/stats', authenticate, getProductivityStats);
router.get('/range', authenticate, getProductivityRange);
router.get('/', authenticate, getProductivityOverview);
router.get('/summary', authenticate, authorize('company_admin', 'manager', 'super_admin', 'hr'), getProductivitySummary);
router.get('/employee/:id', authenticate, getEmployeeProductivity);

// ── Keyword management (admin / manager only) ─────────────────────────────────
router.get('/keywords', authenticate, authorize('company_admin', 'super_admin'), listKeywords);
router.post('/keywords', authenticate, authorize('company_admin', 'super_admin'), createKeyword);
router.put('/keywords/:id', authenticate, authorize('company_admin', 'super_admin'), updateKeyword);
router.delete('/keywords/:id', authenticate, authorize('company_admin', 'super_admin'), deleteKeyword);

export default router;
