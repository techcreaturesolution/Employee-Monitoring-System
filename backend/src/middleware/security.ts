import { Request } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
// @ts-ignore
import xss from 'xss-clean';
import { doubleCsrf } from 'csrf-csrf';
import rateLimit from 'express-rate-limit';
import { config } from '../config';

// NoSQL injection guard
export const sanitizeMongo = mongoSanitize({
  replaceWith: '_',
});

// HTTP Parameter Pollution guard
export const preventHpp = hpp();

// XSS sanitization
export const sanitizeXss = xss();

// CSRF (double-submit cookie pattern)
export const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => config.jwt.secret,
  cookieName: 'ems_csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    secure: config.nodeEnv === 'production',
    path: '/',
  },
  size: 64,
  getSessionIdentifier: (req: Request) => req.cookies.ems_token || 'anonymous',
  getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'] as string,
});

// Dedicated stricter limiter for the desktop agent auth
export const agentAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many agent authentication attempts.' },
});
