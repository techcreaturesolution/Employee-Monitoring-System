import { Router } from 'express';
import {
  uploadScreenshot as uploadScreenshotHandler,
  listScreenshots,
  getScreenshot,
  deleteScreenshot,
  getScreenshotTimeline,
  getScreenshotGrid,
  downloadScreenshot,
  getScreenshotFilters,
} from './screenshot.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { upload, handleUploadError, compressScreenshot } from '../../middleware/uploadValidator';

const router = Router();

router.use(authenticate);

// Existing
router.post('/upload', upload.single('screenshot'), handleUploadError, compressScreenshot, uploadScreenshotHandler);
router.get('/', listScreenshots);
router.get('/:id', getScreenshot);
router.delete('/:id', authorize('company_admin', 'super_admin'), deleteScreenshot);

// New endpoints
router.get('/view/timeline', getScreenshotTimeline);
router.get('/view/grid', getScreenshotGrid);
router.get('/view/download', downloadScreenshot);
router.get('/view/filters', getScreenshotFilters);

export default router;
