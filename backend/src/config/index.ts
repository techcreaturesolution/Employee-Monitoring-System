import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-monitoring',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
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
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@employeemonitor.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456',
  },
};
