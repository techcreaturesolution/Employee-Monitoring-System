import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  appName: string;
  windowTitle: string;
  url: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  category: 'productive' | 'neutral' | 'unproductive';
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    appName: { type: String, required: true },
    windowTitle: { type: String, default: '' },
    url: { type: String, default: '' },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    durationMinutes: { type: Number, default: 0 },
    category: {
      type: String,
      enum: ['productive', 'neutral', 'unproductive'],
      default: 'neutral',
    },
  },
  { timestamps: true }
);

activityLogSchema.index({ userId: 1, startTime: -1 });
activityLogSchema.index({ tenantId: 1, startTime: -1 });
activityLogSchema.index({ tenantId: 1, userId: 1, startTime: -1 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
