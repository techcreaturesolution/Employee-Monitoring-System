import { Router } from 'express';
import {
  uploadScreenshot as uploadScreenshotHandler,
  listScreenshots,
  getScreenshot,
  deleteScreenshot,
} from '../controllers/screenshotController';
import { authenticate, authorize } from '../middleware/auth';
import { uploadScreenshot } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.post('/upload', uploadScreenshot.single('screenshot'), uploadScreenshotHandler);
router.get('/', listScreenshots);
router.get('/:id', getScreenshot);
router.delete('/:id', authorize('company_admin', 'super_admin'), deleteScreenshot);

export default router;
