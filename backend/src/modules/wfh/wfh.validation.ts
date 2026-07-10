import Joi from 'joi';

export const applyWFHSchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
  }),
  reason: Joi.string().min(5).required().messages({
    'string.min': 'Reason must be at least 5 characters long',
  }),
});

export const updateWFHSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
});

export const wfhQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  page: Joi.string().pattern(/^\d+$/).optional(),
  limit: Joi.string().pattern(/^\d+$/).optional(),
}).unknown(true);
