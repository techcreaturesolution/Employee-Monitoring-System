import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

// Track connection state
let isRedisAvailable = false;
let hasLoggedDisconnect = false;

// ── Build a safe Redis URL ─────────────────────────────────────────────────────
// Priority: REDIS_URL env var > REDIS_HOST/PORT/PASSWORD > localhost default
const buildRedisUrl = (): string | null => {
  try {
    // 1. Use REDIS_URL if provided (Render / Railway / Heroku inject this automatically)
    if (process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '') {
      return process.env.REDIS_URL.trim();
    }

    const host = (process.env.REDIS_HOST || 'localhost').trim();
    const port = (process.env.REDIS_PORT || '6379').trim();
    const password = (process.env.REDIS_PASSWORD || '').trim();

    // 2. If REDIS_HOST is already a full URL, use as-is
    if (host.startsWith('redis://') || host.startsWith('rediss://')) {
      return host;
    }

    // 3. Build standard redis:// URL
    const auth = password ? `:${password}@` : '';
    return `redis://${auth}${host}:${port}`;
  } catch (err) {
    logger.warn('Redis: Failed to build connection URL — running without cache.', { err });
    return null;
  }
};

// ── Create client (never crash on bad config) ──────────────────────────────────
let redisClient: RedisClientType | null = null;

const redisUrl = buildRedisUrl();

if (redisUrl) {
  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 5 && !isRedisAvailable) {
            logger.warn('Redis not available after 5 attempts — running without cache.');
            return false; // stop retrying
          }
          return Math.min(retries * 1000, 30000); // 1s, 2s … 30s max
        },
        connectTimeout: 3000,
      },
      disableOfflineQueue: true,
    }) as RedisClientType;

    redisClient.on('error', (_err: Error) => {
      if (!hasLoggedDisconnect) {
        hasLoggedDisconnect = true;
        logger.warn('Redis unavailable — cache disabled. Start Redis to enable caching.');
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
        logger.warn('Redis connection lost — attempting to reconnect...');
        isRedisAvailable = false;
      }
    });
  } catch (err) {
    // createClient() itself threw (e.g. invalid URL format) — log and continue without cache
    logger.warn('Redis: createClient failed — running without cache.', { err });
    redisClient = null;
  }
} else {
  logger.warn('Redis: No valid connection URL — running without cache.');
}

// ── Connect ────────────────────────────────────────────────────────────────────
export const connectRedis = async (): Promise<boolean> => {
  if (!redisClient) return false;
  try {
    await redisClient.connect();
    return true;
  } catch {
    logger.warn('Redis unavailable — running without cache. This is OK for development.');
    return false;
  }
};

export const isRedisConnected = () => isRedisAvailable;

// ── Cache helpers (all no-op when Redis is down) ───────────────────────────────
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (!isRedisAvailable || !redisClient) return null;
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<boolean> {
    if (!isRedisAvailable || !redisClient) return false;
    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  async delete(key: string): Promise<boolean> {
    if (!isRedisAvailable || !redisClient) return false;
    try {
      const result = await redisClient.del(key);
      return result > 0;
    } catch {
      return false;
    }
  },

  async clear(): Promise<boolean> {
    if (!isRedisAvailable || !redisClient) return false;
    try {
      await redisClient.flushAll();
      logger.info('Cache cleared (FLUSHALL)');
      return true;
    } catch {
      return false;
    }
  },

  async setPattern(pattern: string, value: any, ttlSeconds = 3600): Promise<boolean> {
    if (!isRedisAvailable || !redisClient) return false;
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
