import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "./auth";
import { ApiError } from "../utils/ApiError";

interface TenantResource {
    tenantId?: Types.ObjectId | string;
}

type ResourceLoader = (
    req: Request
) => Promise<TenantResource | null>;

/**
 * Ensures that the authenticated user can only access
 * resources belonging to their own tenant.
 *
 * Example:
 *
 * router.get(
 *   "/employees/:id",
 *   authenticate,
 *   requireTenantOwnership(async (req) => {
 *      return User.findById(req.params.id).select("tenantId");
 *   }),
 *   controller
 * );
 */
export const requireTenantOwnership =
    (loadResource: ResourceLoader) =>
        async (
            req: AuthRequest,
            _res: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                if (!req.user) {
                    return next(new ApiError(401, "Authentication required."));
                }

                const resource = await loadResource(req);

                if (!resource) {
                    return next(new ApiError(404, "Resource not found."));
                }

                const resourceTenantId = resource.tenantId?.toString();
                const userTenantId = req.user.tenantId?.toString();

                if (!resourceTenantId || !userTenantId) {
                    return next(new ApiError(403, "Tenant validation failed."));
                }

                if (resourceTenantId !== userTenantId) {
                    return next(
                        new ApiError(
                            403,
                            "Access denied. Resource belongs to another tenant."
                        )
                    );
                }

                next();
            } catch (error) {
                next(error);
            }
        };