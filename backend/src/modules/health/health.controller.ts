import { Request, Response } from 'express';
import mongoose from 'mongoose';
import os from 'os';
import { cache } from '../../services/cache';
import { ApiResponse } from '../../utils/ApiResponse';

export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  let redisOk = false;
  try {
    await cache.set('health:ping', 'ok', 5);
    redisOk = (await cache.get('health:ping')) === 'ok';
  } catch {
    redisOk = false;
  }

  const healthy = dbState === 1; // Redis is optional, don't fail on it

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryUsagePct = Math.round((usedMem / totalMem) * 100);

  // very basic CPU load average representation (1 min avg) normalized by core count
  const cpuAvg = os.loadavg()[0];
  const cpuCores = os.cpus().length;
  const cpuUsagePct = Math.min(100, Math.round((cpuAvg / cpuCores) * 100));

  res.status(healthy ? 200 : 503).json(
    new ApiResponse(healthy ? 200 : 503, healthy ? 'Database is healthy' : 'Database connection error', {
      database: dbState === 1 ? 'connected' : 'disconnected',
      redis: redisOk ? 'connected' : 'unavailable (running without cache)',
      system: {
        cpuUsage: cpuUsagePct,
        memoryUsage: memoryUsagePct,
        totalMemoryGB: (totalMem / (1024 ** 3)).toFixed(1),
        uptimeSeconds: os.uptime(),
      }
    })
  );
};
