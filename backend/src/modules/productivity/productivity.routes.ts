import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  getProductivityStats,
  getProductivityRange,
  listKeywords,
  createKeyword,
  updateKeyword,
  deleteKeyword,
} from "./productivity.controller";

const router = Router();

// ── Productivity stats (all authenticated users) ─────────────────────────────
// GET /api/productivity/stats?userId=xxx&date=2026-07-01
router.get("/stats", authenticate, getProductivityStats);

// GET /api/productivity/range?userId=xxx&startDate=2026-07-01&endDate=2026-07-07
router.get("/range", authenticate, getProductivityRange);

// ── Keyword management (admin / manager only) ─────────────────────────────────
// GET /api/productivity/keywords?category=productive
router.get("/keywords", authenticate, listKeywords);

// POST /api/productivity/keywords
router.post("/keywords", authenticate, createKeyword);

// PUT /api/productivity/keywords/:id
router.put("/keywords/:id", authenticate, updateKeyword);

// DELETE /api/productivity/keywords/:id
router.delete("/keywords/:id", authenticate, deleteKeyword);

export default router;
