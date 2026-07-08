import Joi from 'joi';

export const punchInSchema = Joi.object({
  ip: Joi.string().ip({ version: ['ipv4', 'ipv6'] }).optional().allow(''),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    address: Joi.string().max(500).allow('').optional(),
    accuracy: Joi.number().min(0).optional(),
  }).optional(),
  screenshotUrl: Joi.string().uri().allow('').optional(),
  method: Joi.string().valid('web', 'agent', 'mobile').optional(),
  workMode: Joi.string().valid('office', 'remote', 'hybrid').optional(),
});

export const punchOutSchema = Joi.object({
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    address: Joi.string().max(500).allow('').optional(),
    accuracy: Joi.number().min(0).optional(),
  }).optional(),
});

export const startBreakSchema = Joi.object({
  reason: Joi.string().max(250).allow('').optional(),
});

export const attendanceQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(30),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  userId: Joi.string().hex().length(24).optional(),
});
