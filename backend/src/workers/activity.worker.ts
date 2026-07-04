import { Job } from "bullmq";
import { createWorker } from "../queue/bullmq";
import { ActivityLog } from "../modules/activity/ActivityLog.model";
import { ProductivityKeyword } from "../modules/productivity/ProductivityKeyword.model";
import { logger } from "../utils/logger";

interface ActivityJobData {
    activityId: string;
}

type Category = "productive" | "neutral" | "unproductive";

export const activityWorker = createWorker(
    "activity",
    async (job: Job<ActivityJobData>) => {
        const { activityId } = job.data;

        const activity = await ActivityLog.findById(activityId);

        if (!activity) {
            logger.warn(`Activity ${activityId} not found`);
            return;
        }

        try {
            let category: Category = "neutral";

            const keywords = await ProductivityKeyword.find({
                tenantId: activity.tenantId,
                enabled: true,
            }).sort({ priority: -1 });

            const app = (activity.appName || "").toLowerCase();
            const title = (activity.windowTitle || "").toLowerCase();
            const url = (activity.url || "").toLowerCase();

            for (const keyword of keywords) {
                const value =
                    keyword.type === "app"
                        ? app
                        : keyword.type === "url"
                            ? url
                            : title;

                let matched = false;

                switch (keyword.matchType) {
                    case "exact":
                        matched = value === keyword.keyword.toLowerCase();
                        break;

                    case "contains":
                        matched = value.includes(keyword.keyword.toLowerCase());
                        break;

                    case "regex":
                        matched = new RegExp(keyword.keyword, "i").test(value);
                        break;
                }

                if (matched) {
                    category = keyword.category;
                    break;
                }
            }

            activity.category = category;

            activity.productivityScore =
                category === "productive"
                    ? 100
                    : category === "neutral"
                        ? 50
                        : 0;

            await activity.save();

            logger.info(
                `Activity ${activityId} processed successfully`
            );
        } catch (error) {
            logger.error("Activity worker failed", {
                activityId,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });

            throw error;
        }
    }
);