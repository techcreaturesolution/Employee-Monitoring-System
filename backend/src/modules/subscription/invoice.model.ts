import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  tenantId: mongoose.Types.ObjectId;
  subscriptionId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  invoiceNumber: string;
  issuedAt: Date;
  paidAt?: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    invoiceNumber: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now },
    paidAt: Date,
  },
  { timestamps: true }
);

invoiceSchema.index({ tenantId: 1, status: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
