import { Router } from 'express';
import { getSubscriptionStatus, createSubscription, handleWebhook } from '../controllers/subscriptionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Webhook is public (Razorpay server calls it directly without Authorization headers)
router.post('/webhook', handleWebhook);

// Protected tenant routes
router.get('/status', authenticate, getSubscriptionStatus);
router.post('/create', authenticate, createSubscription);

export default router;
