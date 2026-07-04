import client from "prom-client";

client.collectDefaultMetrics({
    prefix: "ems_",
});

export const register = client.register;

/**
 * HTTP Request Counter
 */
export const httpRequestsTotal = new client.Counter({
    name: "ems_http_requests_total",
    help: "Total HTTP Requests",
    labelNames: ["method", "route", "status"],
});

/**
 * HTTP Request Duration
 */
export const httpRequestDuration = new client.Histogram({
    name: "ems_http_request_duration_seconds",
    help: "HTTP request duration",

    labelNames: ["method", "route", "status"],

    buckets: [
        0.005,
        0.01,
        0.05,
        0.1,
        0.3,
        0.5,
        1,
        2,
        5,
    ],
});

/**
 * Active HTTP Requests
 */
export const activeRequests = new client.Gauge({
    name: "ems_active_requests",

    help: "Current active requests",
});

/**
 * MongoDB Status
 */
export const mongoStatus = new client.Gauge({
    name: "ems_mongodb_connected",

    help: "MongoDB connection status",
});

/**
 * Redis Status
 */
export const redisStatus = new client.Gauge({
    name: "ems_redis_connected",

    help: "Redis connection status",
});

/**
 * Queue Size
 */
export const queueSize = new client.Gauge({
    name: "ems_queue_size",

    help: "BullMQ Queue Size",

    labelNames: ["queue"],
});

/**
 * Queue Failed Jobs
 */
export const failedJobs = new client.Counter({
    name: "ems_queue_failed_jobs_total",

    help: "Failed BullMQ Jobs",

    labelNames: ["queue"],
});

/**
 * Screenshot Uploads
 */
export const screenshotUploads = new client.Counter({
    name: "ems_screenshot_upload_total",

    help: "Uploaded screenshots",
});

/**
 * Login Counter
 */
export const loginCounter = new client.Counter({
    name: "ems_login_total",

    help: "Successful Logins",
});

/**
 * Attendance Counter
 */
export const attendanceCounter = new client.Counter({
    name: "ems_attendance_total",

    help: "Attendance Events",
});

/**
 * Error Counter
 */
export const errorCounter = new client.Counter({
    name: "ems_errors_total",

    help: "Application Errors",

    labelNames: ["type"],
});