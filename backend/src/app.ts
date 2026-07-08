import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import * as Sentry from '@sentry/node';
import { config } from './config';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { sanitizeMongo, preventHpp, sanitizeXss, doubleCsrfProtection, generateCsrfToken } from './middleware/security';
import { authLimiter, refreshLimiter, screenshotLimiter, generalLimiter } from './middleware/rateLimiters';
import { isOriginAllowed } from './utils/cors';
import healthRoutes from './modules/health/health.routes';

export const app = express();
app.set('trust proxy', 1);

// Initialize Sentry
if (config.nodeEnv === 'production' && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.nodeEnv,
    tracesSampleRate: 0.1,
  });
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({
  limit: '1mb',
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(sanitizeMongo);
app.use(preventHpp);
app.use(sanitizeXss);
app.use(morgan('dev'));
app.use(compression());

// CSRF configuration
app.get('/api/csrf-token', (req, res) => {
  res.json({ success: true, csrfToken: generateCsrfToken(req, res) });
});

app.use((req, res, next) => {
  const skipCsrf =
    req.path.startsWith('/api/agent') ||
    req.path.startsWith('/api/mobile') ||
    req.path.startsWith('/api/auth/login') ||
    req.path.startsWith('/api/auth/register') ||
    req.path.startsWith('/api/auth/refresh-token') ||
    req.method === 'GET';
  if (skipCsrf) return next();
  return doubleCsrfProtection(req, res, next);
});

// Apply rate limiters
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/mobile/login', authLimiter);
app.use('/api/auth/refresh-token', refreshLimiter);
app.use('/api/agent/screenshot', screenshotLimiter);
app.use('/api/', generalLimiter);

// Static assets
app.use('/uploads', express.static(path.resolve(config.upload.dir)));

// Health check routes
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// API routes
app.use('/api', routes);

// 404 Route handler
app.use(notFound);

// Sentry error handler
if (config.nodeEnv === 'production' && process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Global error handler
app.use(errorHandler);
