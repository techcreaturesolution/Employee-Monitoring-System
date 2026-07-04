import { Router } from 'express';
import {
  trackLocation,
  batchTrackLocations,
  getLocationHistory,
  getLiveLocations,
  checkGeofence,
  getLocationTrail,
  getMyCurrentLocation,
} from '../controllers/locationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/track', trackLocation);
router.post('/update', trackLocation);
router.post('/batch', batchTrackLocations);
router.post('/geofence-check', checkGeofence);
router.get('/history', getLocationHistory);
router.get('/current', getMyCurrentLocation);
router.get('/live', authorize('company_admin', 'manager', 'super_admin'), getLiveLocations);
router.get('/trail', authorize('company_admin', 'manager', 'super_admin'), getLocationTrail);

export default router;
