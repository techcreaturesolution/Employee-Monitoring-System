import mongoose from "mongoose";
import os from "os";
import { isRedisConnected } from "./cache";
import { config } from "../config";

interface HealthResponse {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    environment: string;
    version: string;
    uptime: number;

    database: {
        status: "connected" | "disconnected";
        readyState: number;
    };

    redis: {
        status: "connected" | "disconnected";
    };

    system: {
        hostname: string;
        platform: string;
        arch: string;

        cpuCount: number;
        loadAverage: number[];

        totalMemory: number;
        freeMemory: number;

        usedMemory: number;
        memoryUsagePercent: number;

        nodeVersion: string;

        processId: number;
    };
}

class HealthService {
    getHealth(): HealthResponse {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();

        const usedMemory = totalMemory - freeMemory;

        const memoryUsagePercent =
            Number(
                ((usedMemory / totalMemory) * 100).toFixed(2)
            );

        const mongoConnected =
            mongoose.connection.readyState === 1;

        const redisConnected =
            isRedisConnected();

        let status: "healthy" | "degraded" | "unhealthy" =
            "healthy";

        if (!mongoConnected) {
            status = "unhealthy";
        } else if (!redisConnected) {
            status = "degraded";
        }

        return {
            status,

            timestamp: new Date().toISOString(),

            environment: config.nodeEnv,

            version:
                process.env.npm_package_version ||
                "1.0.0",

            uptime: Math.round(process.uptime()),

            database: {
                status: mongoConnected
                    ? "connected"
                    : "disconnected",

                readyState:
                    mongoose.connection.readyState,
            },

            redis: {
                status: redisConnected
                    ? "connected"
                    : "disconnected",
            },

            system: {
                hostname: os.hostname(),

                platform: os.platform(),

                arch: os.arch(),

                cpuCount: os.cpus().length,

                loadAverage: os.loadavg(),

                totalMemory,

                freeMemory,

                usedMemory,

                memoryUsagePercent,

                nodeVersion: process.version,

                processId: process.pid,
            },
        };
    }
}

export const healthService =
    new HealthService();