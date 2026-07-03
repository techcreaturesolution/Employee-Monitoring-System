import { Router } from "express";
import {
  uploadScreenshot as uploadScreenshotHandler,
  listScreenshots,
  getScreenshot,
  deleteScreenshot,
} from "./screenshot.controller";
import { authenticate, authorize } from "../../middleware/auth";
import {
  upload,
  handleUploadError,
  compressScreenshot,
} from "../../middleware/uploadValidator";

const router = Router();

router.use(authenticate);

router.post(
  "/upload",
  upload.single("screenshot"),
  handleUploadError,
  compressScreenshot,
  uploadScreenshotHandler
);
router.get("/", listScreenshots);
router.get("/:id", getScreenshot);
router.delete(
  "/:id",
  authorize("company_admin", "super_admin"),
  deleteScreenshot
);

export default router;
