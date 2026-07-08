import { Router } from 'express';
import { getSubscriptionStatus, createSubscription, handleWebhook } from './subscription.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createSubscriptionSchema } from './subscription.validation';

const router = Router();

// Webhook is public (Razorpay server calls it directly without Authorization headers)
router.post('/webhook', handleWebhook);

// Protected tenant routes
router.get('/status', authenticate, getSubscriptionStatus);
router.post('/create', authenticate, validate(createSubscriptionSchema), createSubscription);

export default router;
