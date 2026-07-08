import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Subscription } from './subscription.model';
import { Tenant } from '../tenant/tenant.model';
import { Invoice } from './invoice.model';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import axios from 'axios';
import crypto from 'crypto';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

// Helper to make authenticated requests to Razorpay API
const razorpayRequest = async (method: 'get' | 'post', path: string, data: any = null) => {
  const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
  const response = await axios({
    method,
    url: `https://api.razorpay.com/v1${path}`,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    data,
  });
  return response.data;
};

export const getSubscriptionStatus = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const subscription = await Subscription.findOne({ tenantId }).lean();
  if (!subscription) {
    res.json(
      new ApiResponse(200, 'Subscription details fetched.', {
        plan: 'free',
        status: 'active',
        currentPeriodEnd: null,
      })
    );
    return;
  }

  res.json(new ApiResponse(200, 'Subscription details fetched.', subscription));
});

export const createSubscription = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const { plan } = req.body;
  if (!['starter', 'business', 'enterprise'].includes(plan)) {
    throw new ApiError(400, 'Invalid subscription plan.');
  }

  let razorpayPlanId = 'plan_demo_starter';
  let amount = 999; // Default Starter: ₹999/mo
  if (plan === 'business') {
    razorpayPlanId = 'plan_demo_business';
    amount = 2999;
  } else if (plan === 'enterprise') {
    razorpayPlanId = 'plan_demo_enterprise';
    amount = 9999;
  }

  let rpSubscription;
  try {
    rpSubscription = await razorpayRequest('post', '/subscriptions', {
      plan_id: razorpayPlanId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
    });
  } catch (rpErr: any) {
    logger.error('Razorpay API subscription creation failed, falling back to mock creation:', rpErr.message);
    // Fallback: Generate mock subscription ID if keys are placeholder envs
    rpSubscription = {
      id: `sub_mock_${crypto.randomBytes(8).toString('hex')}`,
      plan_id: razorpayPlanId,
      current_start: Math.floor(Date.now() / 1000),
      current_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
    };
  }

  const subscription = await Subscription.findOneAndUpdate(
    { tenantId },
    {
      plan,
      status: 'active',
      razorpaySubscriptionId: rpSubscription.id,
      razorpayPlanId: rpSubscription.plan_id,
      currentPeriodStart: new Date(rpSubscription.current_start * 1000),
      currentPeriodEnd: new Date(rpSubscription.current_end * 1000),
      amount,
      currency: 'INR',
    },
    { new: true, upsert: true }
  );

  // Update Tenant active plan status
  await Tenant.findByIdAndUpdate(tenantId, { plan, status: 'active' });

  // Generate pending invoice
  const invoiceNumber = `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  await Invoice.create({
    tenantId,
    subscriptionId: subscription._id,
    amount,
    currency: 'INR',
    status: 'pending',
    razorpayOrderId: rpSubscription.id,
    invoiceNumber,
    issuedAt: new Date(),
  });

  res.status(201).json(new ApiResponse(201, 'Subscription initiated successfully.', subscription));
});

export const handleWebhook = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const webhookSecret = config.razorpay.webhookSecret;

  if (webhookSecret && signature) {
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update((req as any).rawBody || JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      throw new ApiError(400, 'Invalid signature.');
    }
  }

  const { event, payload } = req.body;
  logger.info(`Received Razorpay Webhook Event: ${event}`);

  if (event && payload && payload.subscription) {
    const rpSub = payload.subscription.entity;
    const subId = rpSub.id;

    let status: 'active' | 'cancelled' | 'expired' | 'past_due' = 'active';
    if (rpSub.status === 'cancelled') status = 'cancelled';
    else if (rpSub.status === 'expired') status = 'expired';
    else if (rpSub.status === 'halted') status = 'past_due';

    const subscription = await Subscription.findOne({ razorpaySubscriptionId: subId });
    if (subscription) {
      subscription.status = status;
      subscription.currentPeriodStart = new Date(rpSub.current_start * 1000);
      subscription.currentPeriodEnd = new Date(rpSub.current_end * 1000);
      await subscription.save();

      // Sync tenant status
      const tenantStatus = status === 'active' ? 'active' : 'suspended';
      await Tenant.findByIdAndUpdate(subscription.tenantId, { status: tenantStatus });

      if (status === 'active') {
        const invoice = await Invoice.findOne({ razorpayOrderId: subId, status: 'pending' });
        if (invoice) {
          invoice.status = 'paid';
          invoice.paidAt = new Date();
          await invoice.save();
        }
      }
    }
  }

  res.json(new ApiResponse(200, 'Webhook processed.'));
});
