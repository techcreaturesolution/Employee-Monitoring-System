import { createServer } from 'http';
import { app } from './app';
import { initSocket } from './socket';
import { connectDatabase } from './config/database';
import { connectRedis } from './services/cache';
import { logger } from './utils/logger';
import { config } from './config';

const httpServer = createServer(app);
const io = initSocket(httpServer);
app.set('io', io);

const startServer = async () => {
  await connectDatabase();
  connectRedis();

  httpServer.listen(config.port, '0.0.0.0', () => {
    const divider = '─'.repeat(50);
    logger.info(`\n${divider}`);
    logger.info(`🚀  EMS API Server running on port ${config.port} [${config.nodeEnv}]`);
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
