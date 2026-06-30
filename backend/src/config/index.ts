import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// ============ VALIDATION ============
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SUPER_ADMIN_PASSWORD',
  'MONGODB_URI',
  'SUPER_ADMIN_EMAIL',
  'FRONTEND_URL',
];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar] || process.env[envVar]?.length === 0
);

if (missingEnvVars.length > 0) {
  console.error(
    `\n❌ FATAL: Missing required environment variables:\n${missingEnvVars.map((v) => `  - ${v}`).join('\n')}\n`
  );
  console.error('Check your .env file. See .env.example for template.\n');
  process.exit(1);
}

// Validate secrets are long enough
if ((process.env.JWT_SECRET || '').length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}

// ============ CONFIG ============
export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI!,
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expire: process.env.JWT_EXPIRE || '7d',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
  frontendUrl: process.env.FRONTEND_URL!,
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL!,
    password: process.env.SUPER_ADMIN_PASSWORD!,
  },
} as const;

export type Config = typeof config;
