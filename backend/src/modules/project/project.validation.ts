import Joi from 'joi';

export const createProjectSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(1000).allow('').optional(),
  members: Joi.array().items(Joi.string().hex().length(24)).optional(),
});

export const updateProjectSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(1000).allow('').optional(),
  members: Joi.array().items(Joi.string().hex().length(24)).optional(),
  status: Joi.string().valid('active', 'completed', 'archived').optional(),
});

export const addTimeEntrySchema = Joi.object({
  description: Joi.string().min(2).max(500).required(),
  minutes: Joi.number().integer().min(1).required(),
  date: Joi.date().iso().default(() => new Date()),
});

export const projectQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('active', 'completed', 'archived').optional(),
});
