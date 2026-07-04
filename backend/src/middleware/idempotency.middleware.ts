import { Response, NextFunction } from "express";
import crypto from "crypto";
import { AuthRequest } from "./auth";
import { cache } from "../services/cache";
import { ApiError } from "../utils/ApiError";

const PREFIX = "idempotency";
const DEFAULT_TTL = 60 * 5; // 5 minutes

export const idempotency =
    (ttl: number = DEFAULT_TTL) =>
        async (
            req: AuthRequest,
            _res: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                if (!["POST", "PUT", "PATCH"].includes(req.method)) {
                    return next();
                }

                const idempotencyKey =
                    (req.headers["idempotency-key"] as string) ||
                    (req.headers["x-idempotency-key"] as string);

                if (!idempotencyKey) {
                    return next();
                }

                const userId = req.user?._id?.toString() || "anonymous";

                const hash = crypto
                    .createHash("sha256")
                    .update(
                        JSON.stringify({
                            method: req.method,
                            path: req.originalUrl,
                            body: req.body,
                        })
                    )
                    .digest("hex");

                const cacheKey = `${PREFIX}:${userId}:${idempotencyKey}`;

                const existing = await cache.get<{ hash: string }>(cacheKey);

                if (existing) {
                    if (existing.hash !== hash) {
                        return next(
                            new ApiError(
                                409,
                                "Idempotency key has already been used with different request data."
                            )
                        );
                    }

                    return next(
                        new ApiError(
                            409,
                            "Duplicate request detected."
                        )
                    );
                }

                await cache.set(
                    cacheKey,
                    {
                        hash,
                        createdAt: Date.now(),
                    },
                    ttl
                );

                next();
            } catch (error) {
                next(error);
            }
        };