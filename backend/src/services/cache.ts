import { createClient } from 'redis';
import { logger } from '../utils/logger';

// Track connection state to avoid spamming logs
let isRedisAvailable = false;
let hasLoggedDisconnect = false;

const redisClient = createClient({
  url: `redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
  socket: {
    // Back off exponentially, max 30s between retries - stop after 5 tries if never connected
    reconnectStrategy: (retries: number) => {
      if (retries > 5 && !isRedisAvailable) {
        // Give up silently if Redis was never available (dev environment without Redis)
        logger.warn('Redis not available after 5 attempts - running without cache. This is OK for development.');
        return false; // stop retrying
      }
      return Math.min(retries * 1000, 30000); // 1s, 2s, 3s ... 30s max
    },
    connectTimeout: 3000,
  },
  disableOfflineQueue: true,
});

redisClient.on('error', (err: Error) => {
  // Only log the first error to avoid flooding the console
  if (!hasLoggedDisconnect) {
    hasLoggedDisconnect = true;
    logger.warn('Redis unavailable - cache disabled. Start Redis to enable caching.');
  }
  isRedisAvailable = false;
});

redisClient.on('connect', () => {
  isRedisAvailable = true;
  hasLoggedDisconnect = false;
  logger.info('Redis Client Connected');
});

redisClient.on('ready', () => {
  isRedisAvailable = true;
  logger.info('Redis Client Ready');
});

redisClient.on('reconnecting', () => {
  if (isRedisAvailable) {
    logger.warn('Redis connection lost - attempting to reconnect...');
    isRedisAvailable = false;
  }
});

export const connectRedis = async (): Promise<boolean> => {
  try {
    await redisClient.connect();
    return true;
  } catch (err) {
    logger.warn('Redis unavailable - running without cache. This is OK for development.');
    return false;
  }
};

export const isRedisConnected = () => isRedisAvailable;

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (!isRedisAvailable) return null;
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      // Silently return null - Redis ops are best-effort
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<boolean> {
    if (!isRedisAvailable) return false;
    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  async delete(key: string): Promise<boolean> {
    if (!isRedisAvailable) return false;
    try {
      const result = await redisClient.del(key);
      return result > 0;
    } catch {
      return false;
    }
  },

  async clear(): Promise<boolean> {
    if (!isRedisAvailable) return false;
    try {
      await redisClient.flushAll();
      logger.info('Cache cleared (FLUSHALL)');
      return true;
    } catch {
      return false;
    }
  },

  async setPattern(pattern: string, value: any, ttlSeconds = 3600): Promise<boolean> {
    if (!isRedisAvailable) return false;
    try {
      const keys = await redisClient.keys(pattern);
      for (const key of keys) {
        await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      }
      return true;
    } catch {
      return false;
    }
  },
};

export default cache;
