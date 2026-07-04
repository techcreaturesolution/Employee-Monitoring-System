import { Job } from "bullmq";
import { createWorker } from "../queue/bullmq";
import { logger } from "../utils/logger";
import { emailService } from "../services/email.service";

export interface EmailJobData {
    to: string;

    subject: string;

    html: string;

    text?: string;

    cc?: string[];

    bcc?: string[];

    attachments?: Array<{
        filename: string;
        path: string;
    }>;
}

export const emailWorker = createWorker(
    "email",
    async (job: Job<EmailJobData>) => {
        try {
            await emailService.send({
                to: job.data.to,

                subject: job.data.subject,

                html: job.data.html,

                text: job.data.text,

                cc: job.data.cc,

                bcc: job.data.bcc,

                attachments: job.data.attachments,
            });

            logger.info(`Email sent to ${job.data.to}`);
        } catch (error) {
            logger.error("Email worker failed", {
                email: job.data.to,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });

            throw error;
        }
    }
);