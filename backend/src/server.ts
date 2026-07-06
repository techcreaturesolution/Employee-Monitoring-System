import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { connectDatabase } from './config/database';
import { connectRedis } from './services/cache';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import * as Sentry from '@sentry/node';
import compression from 'compression';
import { logger } from './utils/logger';

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

// Initialize Sentry
if (config.nodeEnv === 'production' && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.nodeEnv,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

// Build the allowed origins list from env + hardcoded defaults
// Mobile apps (Flutter/React Native) send requests with no Origin header — !origin allows them
const buildAllowedOrigins = () => {
  const origins = [
    config.frontendUrl,
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5173',
    'https://empsystem-tcs.netlify.app',
  ];
  // Support comma-separated additional origins from env (e.g. deployed frontend URL)
  if (process.env.ADDITIONAL_ALLOWED_ORIGINS) {
    process.env.ADDITIONAL_ALLOWED_ORIGINS.split(',').forEach((o) => origins.push(o.trim()));
  }
  return origins;
};

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // Mobile apps / curl / server-to-server — no origin = allow
  if (origin === 'null') return true; // Capacitor / Cordova send literal "null"
  if (origin.startsWith('file://')) return true; // Electron / desktop webview
  if (origin.startsWith('capacitor://')) return true; // Capacitor iOS/Android
  if (origin.startsWith('ionic://')) return true; // Ionic
  return buildAllowedOrigins().includes(origin);
};

const io = new SocketServer(httpServer, {
  cors: {
    origin: function (origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(compression()); // Gzip compress responses

// ============ RATE LIMITERS ============
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    success: false,
    message: 'Too many login attempts. Try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: any, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // higher - machine call, not login
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many refresh attempts.' },
});

const screenshotLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 screenshots per minute
  skipSuccessfulRequests: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 300 : 10000,
  message: 'Too many requests. Please try again later.',
});

// ============ APPLY LIMITERS ============
// Auth routes - strict limits
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/mobile/login', authLimiter);
app.use('/api/auth/refresh-token', refreshLimiter);

// Screenshot route - moderate limits
app.use('/api/agent/screenshot', screenshotLimiter);

// All other routes - general limits
app.use('/api/', generalLimiter);

app.use('/uploads', express.static(path.resolve(config.upload.dir)));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Employee Monitoring System API is running', timestamp: new Date().toISOString() });
});

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Employee Monitoring System API is running', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use(notFound);

// Sentry error handler
if (config.nodeEnv === 'production' && process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

// ============ AUTHENTICATION MIDDLEWARE ============
io.use((socket: any, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required - no token provided'));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // Attach user info to socket
    socket.userId = decoded.userId;
    socket.tenantId = decoded.tenantId;
    socket.role = decoded.role;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new Error('Token expired'));
    }
    return next(new Error('Invalid token'));
  }
});

// ============ CONNECTION HANDLER ============
io.on('connection', (socket: any) => {
  logger.info(
    `✅ User ${socket.userId} (tenant: ${socket.tenantId}) connected`
  );

  if (socket.userId) {
    socket.join(socket.userId.toString());
  }

  // Join tenant room
  socket.on('join-tenant', (requestedTenantId: string) => {
    // Verify tenant match
    if (socket.tenantId !== requestedTenantId) {
      socket.emit('error', {
        code: 'TENANT_MISMATCH',
        message: 'Unauthorized - you do not belong to this tenant',
      });
      return;
    }

    socket.join(`tenant-${requestedTenantId}`);
    logger.info(`✅ User ${socket.userId} joined tenant ${requestedTenantId}`);
  });

  // Broadcast employee status (managers/admins only)
  socket.on('employee-status', (data: { userId: string; status: string }) => {
    if (!['company_admin', 'manager'].includes(socket.role)) {
      socket.emit('error', {
        code: 'UNAUTHORIZED',
        message: 'Only managers and admins can broadcast status updates',
      });
      return;
    }

    io.to(`tenant-${socket.tenantId}`).emit('employee-status-update', {
      userId: data.userId,
      status: data.status,
      updatedAt: new Date(),
    });
  });

  // New screenshot notification
  socket.on('new-screenshot', (data: { screenshot: any }) => {
    io.to(`tenant-${socket.tenantId}`).emit('screenshot-received', {
      ...data,
      userId: socket.userId,
      receivedAt: new Date(),
    });
  });

  socket.on('disconnect', () => {
    logger.info(`❌ User ${socket.userId} disconnected`);
  });

  socket.on('error', (error: any) => {
    logger.error(`Socket error for ${socket.userId}:`, error);
  });
});

const startServer = async () => {
  await connectDatabase();
  connectRedis(); // optional — runs without cache if Redis is not available

  httpServer.listen(config.port, '0.0.0.0', () => {
    const divider = '─'.repeat(50);
    logger.info(`\n${divider}`);
    logger.info(`🚀  EMS API Server`);
    logger.info(`   Mode    : ${config.nodeEnv}`);
    logger.info(`   Port    : ${config.port}`);
    logger.info(`   URL     : http://localhost:${config.port}/api`);
    logger.info(`   Health  : http://localhost:${config.port}/api/health`);
    logger.info(`${divider}\n`);
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`\n❌  Port ${config.port} is already in use.`);
      logger.error(`   Another server process is still running on this port.`);
      logger.error(`   Fix: Run this command to free the port, then restart:`);
      logger.error(`   > Get-Process -Id (Get-NetTCPConnection -LocalPort ${config.port}).OwningProcess | Stop-Process -Force\n`);
    } else {
      logger.error('Server error:', err);
    }
    process.exit(1);
  });
};

startServer();

process.on('SIGTERM', () => {
  logger.info('🛑  Server shutting down gracefully...');
  httpServer.close(() => {
    logger.info('✅  Server closed.');
    process.exit(0);
  });
});

export { app, io };
