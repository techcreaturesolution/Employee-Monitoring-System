import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  email: string;
  phone: string;
  domain: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  logo: string;
  plan: 'free' | 'starter' | 'business' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  settings: {
    screenshotInterval: number;
    trackApps: boolean;
    trackUrls: boolean;
    blurScreenshots: boolean;
    maxEmployees: number;
    workStartTime: string;
    workEndTime: string;
    timezone: string;
    allowManualPunch: boolean;
    autoStopTracking: boolean;
    idleTimeThreshold: number;
  };
  subscriptionId: mongoose.Types.ObjectId;
  trialEndsAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, default: '' },
    domain: { type: String, default: '' },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: 'India' },
      zipCode: { type: String, default: '' },
    },
    logo: { type: String, default: '' },
    plan: {
      type: String,
      enum: ['free', 'starter', 'business', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'trial'],
      default: 'trial',
    },
    settings: {
      screenshotInterval: { type: Number, default: 10 },
      trackApps: { type: Boolean, default: true },
      trackUrls: { type: Boolean, default: true },
      blurScreenshots: { type: Boolean, default: false },
      maxEmployees: { type: Number, default: 5 },
      workStartTime: { type: String, default: '09:00' },
      workEndTime: { type: String, default: '18:00' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      allowManualPunch: { type: Boolean, default: true },
      autoStopTracking: { type: Boolean, default: true },
      idleTimeThreshold: { type: Number, default: 5 },
    },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    trialEndsAt: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

tenantSchema.index({ email: 1 });
tenantSchema.index({ status: 1 });

export const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);
