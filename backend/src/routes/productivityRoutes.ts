import { Router } from 'express';
import { authenticate } from '../middleware/auth';
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
} from '../controllers/productivityController';

const router = Router();

// ── Productivity stats (all authenticated users) ─────────────────────────────
// GET /api/productivity/stats?userId=xxx&date=2026-07-01
router.get('/stats', authenticate, getProductivityStats);

// GET /api/productivity/range?userId=xxx&startDate=2026-07-01&endDate=2026-07-07
router.get('/range', authenticate, getProductivityRange);

// GET /api/productivity  — overview (same as stats but simplified)
router.get('/', authenticate, getProductivityOverview);

// GET /api/productivity/summary
router.get('/summary', authenticate, getProductivitySummary);

// GET /api/productivity/employee/:id
router.get('/employee/:id', authenticate, getEmployeeProductivity);

// ── Keyword management (admin / manager only) ─────────────────────────────────
router.get('/keywords', authenticate, listKeywords);
router.post('/keywords', authenticate, createKeyword);
router.put('/keywords/:id', authenticate, updateKeyword);
router.delete('/keywords/:id', authenticate, deleteKeyword);

export default router;

