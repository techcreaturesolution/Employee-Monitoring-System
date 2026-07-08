import Joi from 'joi';

export const createDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  managerId: Joi.string().hex().length(24).optional(),
  description: Joi.string().max(500).allow('').optional(),
});

export const updateDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  managerId: Joi.string().hex().length(24).allow(null).optional(),
  description: Joi.string().max(500).allow('').optional(),
});
