import mongoose, { Schema, Document } from 'mongoose';

export interface IWFHRequest extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const wfhRequestSchema = new Schema<IWFHRequest>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

wfhRequestSchema.index({ tenantId: 1, userId: 1, date: 1 }, { unique: true });
wfhRequestSchema.index({ tenantId: 1, status: 1 });

export const WFHRequest = mongoose.model<IWFHRequest>('WFHRequest', wfhRequestSchema);
