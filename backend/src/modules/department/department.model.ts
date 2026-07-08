import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  tenantId: mongoose.Types.ObjectId;
  managerId?: mongoose.Types.ObjectId;
  description?: string;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

departmentSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const Department = mongoose.model<IDepartment>('Department', departmentSchema);
