import mongoose, { Schema, Document } from 'mongoose';

export interface ILeave extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  leaveType: 'sick' | 'casual' | 'paid' | 'unpaid';
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: mongoose.Types.ObjectId;
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leaveSchema = new Schema<ILeave>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    leaveType: {
      type: String,
      enum: ['sick', 'casual', 'paid', 'unpaid'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

leaveSchema.index({ userId: 1, status: 1 });
leaveSchema.index({ tenantId: 1, startDate: 1 });

export const Leave = mongoose.model<ILeave>('Leave', leaveSchema);
