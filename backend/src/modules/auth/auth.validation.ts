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

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  companyName: Joi.string().min(2).max(150).required(),
  email: Joi.string().email().required(),
  password: passwordSchema.required(),
  phone: Joi.string().pattern(/^\+?[0-9]{10,14}$/).optional().messages({
    'string.pattern.base': 'Invalid phone number format',
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required(),
  deviceId: Joi.string().optional(),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(1).max(100).trim().optional(),
  phone: Joi.string().max(20).trim().allow('').optional(),
  avatar: Joi.string().uri().max(500).allow('').optional(),
  department: Joi.string().max(100).trim().allow('').optional(),
  designation: Joi.string().max(100).trim().allow('').optional(),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system').optional(),
    language: Joi.string().optional(),
    notifyEmail: Joi.boolean().optional(),
    notifyPush: Joi.boolean().optional(),
    privacyShareLocation: Joi.boolean().optional(),
  }).optional(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).required(),
  newPassword: passwordSchema.required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: passwordSchema.required(),
});

