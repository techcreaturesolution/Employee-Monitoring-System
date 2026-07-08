import { Request, Response } from 'express';
import mongoose from 'mongoose';
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
  res.status(healthy ? 200 : 503).json(
    new ApiResponse(healthy ? 200 : 503, healthy ? 'Database is healthy' : 'Database connection error', {
      database: dbState === 1 ? 'connected' : 'disconnected',
      redis: redisOk ? 'connected' : 'unavailable (running without cache)',
    })
  );
};
