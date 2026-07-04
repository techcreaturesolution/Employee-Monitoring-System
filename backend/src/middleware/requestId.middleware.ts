import { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";

declare global {
    namespace Express {
        interface Request {
            requestId: string;
        }
    }
}

export const requestIdMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const requestId = uuid();

    req.requestId = requestId;

    res.setHeader("X-Request-ID", requestId);

    next();
};