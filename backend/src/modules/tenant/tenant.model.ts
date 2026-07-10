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
    formatted?: string;
  };
  location?: {
    type: 'Point';
    coordinates: [number, number];
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
    enableGeofencing: boolean;
    officeLocations: Array<{
      name: string;
      latitude: number;
      longitude: number;
      radiusMeters: number;
    }>;
    mobileLocationInterval: number;
    requireLocationForPunch: boolean;
    enforceDeviceFingerprint: boolean;
  };
  subscriptionId: mongoose.Types.ObjectId;
  trialEndsAt: Date;
  isEmailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpiry?: Date;
  pendingEmail?: string;
  onboardingCompleted: boolean;
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
      formatted: { type: String, default: '' },
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
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
      screenshotInterval: { type: Number, default: 2 },
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
      enableGeofencing: { type: Boolean, default: false },
      officeLocations: [
        {
          name: { type: String, required: true },
          latitude: { type: Number, required: true },
          longitude: { type: Number, required: true },
          radiusMeters: { type: Number, default: 100 },
        },
      ],
      mobileLocationInterval: { type: Number, default: 15 },
      requireLocationForPunch: { type: Boolean, default: false },
      enforceDeviceFingerprint: { type: Boolean, default: false },
    },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    trialEndsAt: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiry: { type: Date, select: false },
    pendingEmail: { type: String, select: false },
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

tenantSchema.index({ status: 1 });
tenantSchema.index({ location: '2dsphere' });

export const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);
