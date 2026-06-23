import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from './config';
import { connectDatabase } from './config/database';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();
const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
  },
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

app.use('/uploads', express.static(path.resolve(config.upload.dir)));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Employee Monitoring System API is running', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join-tenant', (tenantId: string) => {
    socket.join(`tenant-${tenantId}`);
  });

  socket.on('employee-status', (data: { tenantId: string; userId: string; status: string }) => {
    io.to(`tenant-${data.tenantId}`).emit('employee-status-update', data);
  });

  socket.on('new-screenshot', (data: { tenantId: string; screenshot: unknown }) => {
    io.to(`tenant-${data.tenantId}`).emit('screenshot-received', data);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  await connectDatabase();
  httpServer.listen(config.port, () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });
};

startServer();

export { app, io };
