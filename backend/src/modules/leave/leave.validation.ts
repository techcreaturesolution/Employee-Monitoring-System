import Joi from 'joi';

export const applyLeaveSchema = Joi.object({
  leaveType: Joi.string().valid('casual', 'sick', 'paid').required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  reason: Joi.string().min(5).max(1000).required(),
});

export const updateLeaveSchema = Joi.object({
  leaveType: Joi.string().valid('casual', 'sick', 'paid').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  reason: Joi.string().min(5).max(1000).optional(),
  status: Joi.string().valid('approved', 'rejected', 'cancelled', 'pending').optional(),
});

export const leaveQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('approved', 'rejected', 'cancelled', 'pending').optional(),
  userId: Joi.string().hex().length(24).optional(),
});
