import { Router, Request, Response } from "express";
import { register } from "../monitoring/monitoring";

const router = Router();

/**
 * Prometheus Metrics Endpoint
 *
 * GET /metrics
 */
router.get("/metrics", async (_req: Request, res: Response) => {
    try {
        res.setHeader("Content-Type", register.contentType);

        res.end(await register.metrics());
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to collect metrics.",
            error:
                error instanceof Error
                    ? error.message
                    : String(error),
        });
    }
});

export default router;