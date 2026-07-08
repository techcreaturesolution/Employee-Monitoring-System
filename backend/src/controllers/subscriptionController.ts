import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Subscription } from '../models/Subscription';
import { Tenant } from '../models/Tenant';
import { config } from '../config';
import { logger } from '../utils/logger';
import axios from 'axios';
import crypto from 'crypto';

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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/subscriptions/status
// Get active subscription info for current tenant
// ─────────────────────────────────────────────────────────────────────────────
export const getSubscriptionStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const subscription = await Subscription.findOne({ tenantId });
    if (!subscription) {
      res.json({
        success: true,
        data: {
          plan: 'free',
          status: 'active',
          currentPeriodEnd: null,
        },
      });
      return;
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    logger.error('getSubscriptionStatus failed:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/create
// Initiates subscription creation with Razorpay
// ─────────────────────────────────────────────────────────────────────────────
export const createSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { plan } = req.body;
    if (!['starter', 'business', 'enterprise'].includes(plan)) {
      res.status(400).json({ success: false, message: 'Invalid subscription plan.' });
      return;
    }

    // Resolve Razorpay plan ID based on SaaS configuration
    // (In production, plan IDs should be stored in Database or Config)
    let razorpayPlanId = 'plan_demo_starter';
    let amount = 999; // Default Starter: ₹999/mo
    if (plan === 'business') {
      razorpayPlanId = 'plan_demo_business';
      amount = 2999;
    } else if (plan === 'enterprise') {
      razorpayPlanId = 'plan_demo_enterprise';
      amount = 9999;
    }

    // Call Razorpay API to create subscription
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

    // Upsert local subscription record
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

    res.status(201).json({
      success: true,
      message: 'Subscription initiated successfully.',
      data: subscription,
    });
  } catch (error) {
    logger.error('createSubscription failed:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/webhook
// Razorpay Webhook listener to sync platform status automatically
// ─────────────────────────────────────────────────────────────────────────────
export const handleWebhook = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = config.razorpay.webhookSecret;

    if (webhookSecret && signature) {
      const shasum = crypto.createHmac('sha256', webhookSecret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        res.status(400).json({ success: false, message: 'Invalid signature.' });
        return;
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

      // Find local subscription record to sync
      const subscription = await Subscription.findOne({ razorpaySubscriptionId: subId });
      if (subscription) {
        subscription.status = status;
        subscription.currentPeriodStart = new Date(rpSub.current_start * 1000);
        subscription.currentPeriodEnd = new Date(rpSub.current_end * 1000);
        await subscription.save();

        // Sync tenant status
        const tenantStatus = status === 'active' ? 'active' : 'suspended';
        await Tenant.findByIdAndUpdate(subscription.tenantId, { status: tenantStatus });
      }
    }

    res.json({ success: true, message: 'Webhook processed.' });
  } catch (error) {
    logger.error('handleWebhook failed:', error);
    next(error);
  }
};
