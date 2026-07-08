import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
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
router.get('/summary', authenticate, getProductivitySummary);
router.get('/employee/:id', authenticate, getEmployeeProductivity);

// ── Keyword management (admin / manager only) ─────────────────────────────────
router.get('/keywords', authenticate, listKeywords);
router.post('/keywords', authenticate, createKeyword);
router.put('/keywords/:id', authenticate, updateKeyword);
router.delete('/keywords/:id', authenticate, deleteKeyword);

export default router;
