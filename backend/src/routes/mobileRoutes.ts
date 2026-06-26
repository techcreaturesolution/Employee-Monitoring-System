import { Router } from 'express';
import {
  mobileLogin,
  mobilePunchIn,
  mobilePunchOut,
  updateWorkMode,
  getMobileConfig,
  getMobileDashboard,
} from '../controllers/mobileController';
import {
  trackLocation,
  batchTrackLocations,
  checkGeofence,
} from '../controllers/locationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', mobileLogin);

router.use(authenticate);

router.post('/punch-in', mobilePunchIn);
router.post('/punch-out', mobilePunchOut);
router.put('/work-mode', updateWorkMode);
router.get('/config', getMobileConfig);
router.get('/dashboard', getMobileDashboard);

router.post('/location/track', trackLocation);
router.post('/location/batch', batchTrackLocations);
router.post('/location/geofence-check', checkGeofence);

export default router;
