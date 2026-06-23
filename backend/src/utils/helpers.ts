import { v4 as uuidv4 } from 'uuid';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { IUser } from '../models/User';

export const generateAgentKey = (): string => {
  return `ems_${uuidv4().replace(/-/g, '')}`;
};

export const generateTokens = (user: IUser) => {
  const payload = {
    userId: user._id,
    role: user.role,
    tenantId: user.tenantId,
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expire,
  } as SignOptions);

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpire,
  } as SignOptions);

  return { accessToken, refreshToken };
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const calculateWorkMinutes = (punchIn: Date, punchOut: Date): number => {
  const diff = punchOut.getTime() - punchIn.getTime();
  return Math.round(diff / (1000 * 60));
};

export const getPlanLimits = (plan: string) => {
  const limits: Record<string, { maxEmployees: number; maxScreenshotsPerDay: number; screenshotInterval: number; dataRetentionDays: number }> = {
    free: { maxEmployees: 5, maxScreenshotsPerDay: 50, screenshotInterval: 30, dataRetentionDays: 7 },
    starter: { maxEmployees: 25, maxScreenshotsPerDay: 500, screenshotInterval: 10, dataRetentionDays: 30 },
    business: { maxEmployees: 100, maxScreenshotsPerDay: 2000, screenshotInterval: 5, dataRetentionDays: 90 },
    enterprise: { maxEmployees: 9999, maxScreenshotsPerDay: 99999, screenshotInterval: 1, dataRetentionDays: 365 },
  };
  return limits[plan] || limits.free;
};

export const paginate = (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  return { skip, limit: Math.min(limit, 100) };
};
