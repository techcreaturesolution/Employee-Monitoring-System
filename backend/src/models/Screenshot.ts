import mongoose, { Schema, Document } from 'mongoose';

export interface IScreenshot extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  timestamp: Date;
  imageUrl: string;
  thumbnailUrl: string;
  activeApp: string;
  windowTitle: string;
  productivityTag: 'productive' | 'neutral' | 'unproductive';
  metadata: {
    resolution: string;
    fileSize: number;
    format: string;
  };
  createdAt: Date;
}

const screenshotSchema = new Schema<IScreenshot>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    imageUrl: { type: String, required: true },
    thumbnailUrl: { type: String, default: '' },
    activeApp: { type: String, default: '' },
    windowTitle: { type: String, default: '' },
    productivityTag: {
      type: String,
      enum: ['productive', 'neutral', 'unproductive'],
      default: 'neutral',
    },
    metadata: {
      resolution: { type: String, default: '' },
      fileSize: { type: Number, default: 0 },
      format: { type: String, default: 'png' },
    },
  },
  { timestamps: true }
);

screenshotSchema.index({ userId: 1, timestamp: -1 });
screenshotSchema.index({ tenantId: 1, timestamp: -1 });
screenshotSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });

export const Screenshot = mongoose.model<IScreenshot>('Screenshot', screenshotSchema);
