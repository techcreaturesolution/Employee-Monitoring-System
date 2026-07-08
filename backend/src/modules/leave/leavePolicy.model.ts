import mongoose, { Schema, Document } from 'mongoose';

export interface ILeavePolicy extends Document {
  tenantId: mongoose.Types.ObjectId;
  casualLeavesPerYear: number;
  sickLeavesPerYear: number;
  paidLeavesPerYear: number;
  carryForward: boolean;
}

const leavePolicySchema = new Schema<ILeavePolicy>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    casualLeavesPerYear: { type: Number, default: 12 },
    sickLeavesPerYear: { type: Number, default: 8 },
    paidLeavesPerYear: { type: Number, default: 15 },
    carryForward: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const LeavePolicy = mongoose.model<ILeavePolicy>('LeavePolicy', leavePolicySchema);
