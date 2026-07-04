import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export const requestLogger = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const startedAt = Date.now();

    res.on("finish", () => {
        logger.info("HTTP Request", {
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: `${Date.now() - startedAt}ms`,
            ip: req.ip,
            userAgent: req.get("user-agent"),
            userId: (req as any).user?._id ?? null,
            tenantId: (req as any).user?.tenantId ?? null,
        });
    });

    next();
};