import { Response, NextFunction } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "./auth";
import { ApiError } from "../utils/ApiError";

interface ResourceOwner {
    _id?: Types.ObjectId | string;
    userId?: Types.ObjectId | string;
    createdBy?: Types.ObjectId | string;
}

type ResourceLoader = (
    req: AuthRequest
) => Promise<ResourceOwner | null>;

const ADMIN_ROLES = [
    "super_admin",
    "company_admin",
    "manager",
];

/**
 * Checks whether the logged-in user owns the requested resource.
 *
 * Managers, Company Admins and Super Admins bypass this check.
 */
export const requireOwnership =
    (loadResource: ResourceLoader) =>
        async (
            req: AuthRequest,
            _res: Response,
            next: NextFunction
        ) => {
            try {
                if (!req.user) {
                    return next(new ApiError(401, "Authentication required."));
                }

                // Admin roles bypass ownership
                if (ADMIN_ROLES.includes(req.user.role)) {
                    return next();
                }

                const resource = await loadResource(req);

                if (!resource) {
                    return next(new ApiError(404, "Resource not found."));
                }

                const ownerId =
                    resource.userId?.toString() ||
                    resource.createdBy?.toString() ||
                    resource._id?.toString();

                if (!ownerId) {
                    return next(new ApiError(403, "Unable to verify ownership."));
                }

                if (ownerId !== req.user._id.toString()) {
                    return next(
                        new ApiError(
                            403,
                            "You don't have permission to access this resource."
                        )
                    );
                }

                next();
            } catch (error) {
                next(error);
            }
        };