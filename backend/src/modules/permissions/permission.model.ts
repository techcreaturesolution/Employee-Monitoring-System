import mongoose, { Schema, Document } from 'mongoose';

export interface IRolePermission extends Document {
  tenantId: mongoose.Types.ObjectId;
  role: string;
  module: string;
  actions: string[]; // e.g., ['view', 'create', 'edit', 'delete']
  createdAt: Date;
  updatedAt: Date;
}

const rolePermissionSchema = new Schema<IRolePermission>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    role: { type: String, required: true },
    module: { type: String, required: true },
    actions: [{ type: String }],
  },
  { timestamps: true }
);

rolePermissionSchema.index({ tenantId: 1, role: 1, module: 1 }, { unique: true });

export const RolePermission = mongoose.model<IRolePermission>('RolePermission', rolePermissionSchema);
