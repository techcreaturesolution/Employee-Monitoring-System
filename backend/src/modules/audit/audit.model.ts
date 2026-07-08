import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action:   { type: String, required: true },       // e.g. 'LOGIN', 'UPDATE_EMPLOYEE', 'DELETE_SCREENSHOT'
    resource: { type: String, required: true },       // e.g. 'User', 'Screenshot', 'Attendance'
    resourceId: { type: String, default: '' },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, action: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
