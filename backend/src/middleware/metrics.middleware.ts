import { Request, Response, NextFunction } from "express";
import {
    activeRequests,
    errorCounter,
    httpRequestDuration,
    httpRequestsTotal,
} from "../monitoring/monitoring";

export const metricsMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    activeRequests.inc();

    const end = httpRequestDuration.startTimer({
        method: req.method,
        route: req.route?.path || req.path,
    });

    res.on("finish", () => {
        activeRequests.dec();

        const labels = {
            method: req.method,
            route: req.route?.path || req.path,
            status: res.statusCode.toString(),
        };

        httpRequestsTotal.inc(labels);

        end(labels);

        if (res.statusCode >= 500) {
            errorCounter.inc({
                type: "server_error",
            });
        } else if (res.statusCode >= 400) {
            errorCounter.inc({
                type: "client_error",
            });
        }
    });

    next();
};