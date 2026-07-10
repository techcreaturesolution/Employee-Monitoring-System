import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { RolePermission } from './permission.model';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { resolveTenantScope } from '../../utils/resolveTenantScope';
import { cache } from '../../services/cache';

export const getPermissions = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = resolveTenantScope(req);
  const permissions = await RolePermission.find({ tenantId });

  res.json(new ApiResponse(200, 'Permissions fetched.', permissions));
});

export const updatePermission = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = resolveTenantScope(req);
  const { role, module, actions } = req.body;

  if (role === 'super_admin') {
    throw new ApiError(403, 'Cannot modify super_admin permissions.');
  }

  const permission = await RolePermission.findOneAndUpdate(
    { tenantId, role, module },
    { actions },
    { new: true, upsert: true }
  );

  await cache.delete(`permissions:${String(tenantId)}:${role}:${module}`);

  res.json(new ApiResponse(200, 'Permission updated successfully.', permission));
});
