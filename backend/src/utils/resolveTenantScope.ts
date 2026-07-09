import { AuthRequest } from '../middleware/auth';

/**
 * Returns the tenantId a request should be scoped to.
 * - Regular users (company_admin, manager, employee): always their own tenantId — never overridable.
 * - super_admin: their own tenantId UNLESS they pass ?tenantId=xxx to view a specific company.
 */
export const resolveTenantScope = (req: AuthRequest): string | undefined => {
  if (req.user?.role === 'super_admin' && req.query.tenantId) {
    return req.query.tenantId as string;
  }
  return req.user?.tenantId ? String(req.user.tenantId) : undefined;
};
