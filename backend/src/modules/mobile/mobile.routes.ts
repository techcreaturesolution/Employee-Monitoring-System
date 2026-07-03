import { Router } from "express";
import {
  mobileLogin,
  mobilePunchIn,
  mobilePunchOut,
  updateWorkMode,
  getMobileConfig,
  getMobileDashboard,
} from "./mobile.controller";
import {
  trackLocation,
  batchTrackLocations,
  checkGeofence,
} from "../location/location.controller";
import { authenticate } from "../../middleware/auth";

const router = Router();

router.post("/login", mobileLogin);

router.use(authenticate);

router.post("/punch-in", mobilePunchIn);
router.post("/punch-out", mobilePunchOut);
router.put("/work-mode", updateWorkMode);
router.get("/config", getMobileConfig);
router.get("/dashboard", getMobileDashboard);

router.post("/location/track", trackLocation);
router.post("/location/batch", batchTrackLocations);
router.post("/location/geofence-check", checkGeofence);

export default router;
