import Joi from 'joi';

const passwordSchema = Joi.string()
  .min(8)
  .pattern(/[A-Z]/, 'at least one uppercase letter')
  .pattern(/[0-9]/, 'at least one number')
  .pattern(/[!@#$%^&*]/, 'at least one special character')
  .messages({
    'string.pattern.name': 'Password must contain {#name}',
    'string.min': 'Password must be at least 8 characters long',
  });

export const addEmployeeSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: passwordSchema.optional(),
  role: Joi.string().valid('employee', 'manager', 'company_admin').optional(),
  department: Joi.string().max(100).allow('').optional(),
  designation: Joi.string().max(100).allow('').optional(),
  employeeId: Joi.string().max(50).allow('').optional(),
  phone: Joi.string().max(20).allow('').optional(),
});

export const updateEmployeeSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  role: Joi.string().valid('employee', 'manager', 'company_admin').optional(),
  department: Joi.string().max(100).allow('').optional(),
  designation: Joi.string().max(100).allow('').optional(),
  employeeId: Joi.string().max(50).allow('').optional(),
  phone: Joi.string().max(20).allow('').optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  workMode: Joi.string().valid('office', 'remote', 'hybrid').optional(),
});

export const employeeQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('active', 'inactive').optional(),
  department: Joi.string().optional(),
  search: Joi.string().optional(),
});
