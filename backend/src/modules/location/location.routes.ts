import { Router } from "express";
import {
  trackLocation,
  batchTrackLocations,
  getLocationHistory,
  getLiveLocations,
  checkGeofence,
  getLocationTrail,
} from "./location.controller";
import { authenticate, authorize } from "../../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/track", trackLocation);
router.post("/batch", batchTrackLocations);
router.post("/geofence-check", checkGeofence);
router.get("/history", getLocationHistory);
router.get(
  "/live",
  authorize("company_admin", "manager", "super_admin"),
  getLiveLocations
);
router.get(
  "/trail",
  authorize("company_admin", "manager", "super_admin"),
  getLocationTrail
);

export default router;
