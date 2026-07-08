import { Router } from 'express';
import {
  trackLocation,
  batchTrackLocations,
  getLocationHistory,
  getLiveLocations,
  checkGeofence,
  getLocationTrail,
  getMyCurrentLocation,
  getLocationDistance,
  getGeofenceList,
} from './location.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Existing
router.post('/track', trackLocation);
router.post('/update', trackLocation);
router.post('/batch', batchTrackLocations);
router.post('/geofence-check', checkGeofence);
router.get('/history', getLocationHistory);
router.get('/current', getMyCurrentLocation);
router.get('/live', authorize('company_admin', 'manager', 'super_admin'), getLiveLocations);
router.get('/trail', authorize('company_admin', 'manager', 'super_admin'), getLocationTrail);

// New
router.get('/distance', authorize('company_admin', 'manager', 'super_admin'), getLocationDistance);
router.get('/geofence', authorize('company_admin', 'manager', 'super_admin'), getGeofenceList);

export default router;
