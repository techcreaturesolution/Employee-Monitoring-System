import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { logger } from './utils/logger';
import { isOriginAllowed } from './utils/cors';

export const initSocket = (httpServer: HttpServer): SocketServer => {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
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
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        return next(new Error('Token expired'));
      }
      return next(new Error('Invalid token'));
    }
  });

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

  return io;
};
