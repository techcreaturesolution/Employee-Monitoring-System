import Joi from 'joi';

export const createTaskSchema = Joi.object({
  title: Joi.string().min(2).max(250).required(),
  deadline: Joi.string().max(100).allow('').optional(),
  userId: Joi.string().hex().length(24).optional(),
  projectId: Joi.string().hex().length(24).allow('').optional(),
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().min(2).max(250).optional(),
  deadline: Joi.string().max(100).allow('').optional(),
  done: Joi.boolean().optional(),
  projectId: Joi.string().hex().length(24).allow('').optional(),
});

export const taskQuerySchema = Joi.object({
  userId: Joi.string().hex().length(24).optional(),
  done: Joi.string().valid('true', 'false').optional(),
  projectId: Joi.string().hex().length(24).optional(),
});
