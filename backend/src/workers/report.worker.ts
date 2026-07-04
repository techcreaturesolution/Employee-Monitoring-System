import { Job } from "bullmq";
import { createWorker } from "../queue/bullmq";
import { logger } from "../utils/logger";
import { reportService } from "../services/report.service";

export interface ReportJobData {
    reportId: string;

    tenantId: string;

    userId: string;

    type:
    | "attendance"
    | "activity"
    | "productivity"
    | "screenshots"
    | "payroll";

    filters?: Record<string, unknown>;
}

export const reportWorker = createWorker(
    "report",
    async (job: Job<ReportJobData>) => {
        try {
            logger.info(
                `Generating ${job.data.type} report (${job.data.reportId})`
            );

            await reportService.generate(job.data);

            logger.info(
                `Report generated (${job.data.reportId})`
            );
        } catch (error) {
            logger.error("Report Worker Failed", {
                reportId: job.data.reportId,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });

            throw error;
        }
    }
);