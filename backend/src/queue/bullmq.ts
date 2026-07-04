import { Queue, Worker, QueueEvents, JobsOptions } from "bullmq";
import IORedis from "ioredis";
import { logger } from "../utils/logger";

const connection = new IORedis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,

    maxRetriesPerRequest: null,
    enableReadyCheck: false,

    retryStrategy(times) {
        return Math.min(times * 1000, 30000);
    },
});

connection.on("connect", () => {
    logger.info("BullMQ Redis connected");
});

connection.on("error", (error) => {
    logger.error("BullMQ Redis error", {
        error: error.message,
    });
});

/**
 * Default Queue Options
 */
const defaultJobOptions: JobsOptions = {
    removeOnComplete: {
        age: 24 * 3600,
        count: 1000,
    },

    removeOnFail: {
        age: 7 * 24 * 3600,
    },

    attempts: 3,

    backoff: {
        type: "exponential",
        delay: 3000,
    },
};

/**
 * Screenshot Queue
 */
export const screenshotQueue = new Queue("screenshot", {
    connection,
    defaultJobOptions,
});

/**
 * Activity Queue
 */
export const activityQueue = new Queue("activity", {
    connection,
    defaultJobOptions,
});

/**
 * Email Queue
 */
export const emailQueue = new Queue("email", {
    connection,
    defaultJobOptions,
});

/**
 * Report Queue
 */
export const reportQueue = new Queue("report", {
    connection,
    defaultJobOptions,
});

/**
 * Queue Events
 */
export const screenshotEvents = new QueueEvents("screenshot", {
    connection,
});

export const activityEvents = new QueueEvents("activity", {
    connection,
});

export const emailEvents = new QueueEvents("email", {
    connection,
});

export const reportEvents = new QueueEvents("report", {
    connection,
});

/**
 * Worker Factory
 */
export function createWorker<T>(
    queueName: string,
    processor: (job: any) => Promise<T>
) {
    const worker = new Worker(queueName, processor, {
        connection,

        concurrency: Number(
            process.env.BULLMQ_CONCURRENCY || 5
        ),
    });

    worker.on("completed", (job) => {
        logger.info(
            `[${queueName}] Job ${job.id} completed`
        );
    });

    worker.on("failed", (job, err) => {
        logger.error(
            `[${queueName}] Job ${job?.id} failed`,
            {
                error: err.message,
            }
        );
    });

    worker.on("error", (err) => {
        logger.error(
            `[${queueName}] Worker error`,
            {
                error: err.message,
            }
        );
    });

    return worker;
}

/**
 * Graceful Shutdown
 */
export async function closeQueues() {
    logger.info("Closing BullMQ...");

    await Promise.all([
        screenshotQueue.close(),
        activityQueue.close(),
        emailQueue.close(),
        reportQueue.close(),

        screenshotEvents.close(),
        activityEvents.close(),
        emailEvents.close(),
        reportEvents.close(),

        connection.quit(),
    ]);

    logger.info("BullMQ closed");
}