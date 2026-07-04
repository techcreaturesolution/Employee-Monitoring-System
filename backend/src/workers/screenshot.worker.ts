import { Job } from "bullmq";
import fs from "fs";
import { createWorker } from "../queue/bullmq";
import { Screenshot } from "../modules/screenshots/Screenshot.model";
import {
    uploadToCloudinary,
    deleteFromCloudinary,
} from "../utils/cloudinary";
import { logger } from "../utils/logger";

interface ScreenshotJobData {
    screenshotId: string;
    filePath: string;
}

export const screenshotWorker = createWorker(
    "screenshot",
    async (job: Job<ScreenshotJobData>) => {
        const { screenshotId, filePath } = job.data;

        logger.info(`Processing screenshot ${screenshotId}`);

        const screenshot = await Screenshot.findById(screenshotId);

        if (!screenshot) {
            logger.warn(`Screenshot ${screenshotId} not found`);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            return;
        }

        try {
            const upload = await uploadToCloudinary(
                filePath,
                "screenshots"
            );

            if (upload) {
                if (screenshot.cloudinaryPublicId) {
                    await deleteFromCloudinary(
                        screenshot.cloudinaryPublicId
                    );
                }

                screenshot.imageUrl = upload.secureUrl;
                screenshot.cloudinaryPublicId = upload.publicId;
            } else {
                screenshot.imageUrl = `/uploads/screenshots/${screenshot.filename}`;
            }

            screenshot.uploadedAt = new Date();

            await screenshot.save();

            logger.info(
                `Screenshot uploaded successfully ${screenshotId}`
            );
        } catch (error) {
            logger.error(
                `Screenshot upload failed ${screenshotId}`,
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : String(error),
                }
            );

            throw error;
        } finally {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }
);