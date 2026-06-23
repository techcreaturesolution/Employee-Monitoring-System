import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  tenantId: mongoose.Types.ObjectId;
  plan: 'free' | 'starter' | 'business' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  razorpaySubscriptionId: string;
  razorpayPlanId: string;
  razorpayCustomerId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  amount: number;
  currency: string;
  invoices: {
    razorpayInvoiceId: string;
    amount: number;
    status: string;
    paidAt: Date;
  }[];
  cancelledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    plan: {
      type: String,
      enum: ['free', 'starter', 'business', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'past_due'],
      default: 'active',
    },
    razorpaySubscriptionId: { type: String, default: '' },
    razorpayPlanId: { type: String, default: '' },
    razorpayCustomerId: { type: String, default: '' },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    invoices: [
      {
        razorpayInvoiceId: { type: String },
        amount: { type: Number },
        status: { type: String },
        paidAt: { type: Date },
      },
    ],
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

subscriptionSchema.index({ tenantId: 1 });
subscriptionSchema.index({ razorpaySubscriptionId: 1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
