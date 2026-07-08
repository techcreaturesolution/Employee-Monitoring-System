import Joi from 'joi';

export const createSubscriptionSchema = Joi.object({
  plan: Joi.string().valid('starter', 'business', 'enterprise').required(),
});
