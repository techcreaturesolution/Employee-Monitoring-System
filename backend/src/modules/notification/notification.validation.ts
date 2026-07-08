import Joi from 'joi';

export const createNotificationSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  title: Joi.string().min(2).max(150).required(),
  message: Joi.string().min(2).max(1000).required(),
  type: Joi.string().valid('system', 'attendance', 'activity', 'performance').optional(),
  link: Joi.string().max(250).allow('').optional(),
});

export const notificationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
