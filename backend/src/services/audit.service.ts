import { AuditLog } from '../modules/audit/audit.model';
import { logger } from '../utils/logger';

interface AuditLogParams {
  tenantId: any;
  userId: any;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failure';
}

export const createAuditEntry = async (params: AuditLogParams): Promise<void> => {
  try {
    await AuditLog.create({
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId || '',
      details: params.details || {},
      ipAddress: params.ipAddress || '',
      userAgent: params.userAgent || '',
      status: params.status || 'success',
    });
  } catch (err) {
    logger.error('createAuditEntry failed (non-fatal):', err);
  }
};
