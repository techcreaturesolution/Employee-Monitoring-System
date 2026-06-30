import { z } from 'zod';

// Password must be 8+ chars with uppercase, number, special char
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[!@#$%^&*]/, 'Password must contain special character');

export const registerSchema = z.object({
  companyName: z
    .string()
    .min(2, 'Company name too short')
    .max(100, 'Company name too long'),
  name: z
    .string()
    .min(2, 'Name too short')
    .max(50, 'Name too long'),
  email: z
    .string()
    .email('Invalid email format'),
  password: passwordSchema,
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,14}$/, 'Invalid phone format')
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
  deviceId: z.string().optional(),
});

export const addEmployeeSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: passwordSchema.optional(),
  role: z.enum(['employee', 'manager', 'company_admin']).optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  employeeId: z.string().optional(),
  phone: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddEmployeeInput = z.infer<typeof addEmployeeSchema>;
