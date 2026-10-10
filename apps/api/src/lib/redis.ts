import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (env.NODE_ENV === 'test') {
      return null; // Don't retry during unit tests
    }
    const delay = Math.min(times * 200, 2000);
    return delay;
  }
});

redis.on('error', (err) => {
  if (env.NODE_ENV !== 'test') {
    logger.warn({ err: err.message }, 'Redis connection issue');
  }
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

export async function checkRedisHealth(): Promise<{ status: 'up' | 'down'; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    const pong = await redis.ping();
    if (pong === 'PONG') {
      return { status: 'up', latencyMs: Date.now() - start };
    }
    return { status: 'down', latencyMs: Date.now() - start, error: 'Unexpected ping response' };
  } catch (err: any) {
    return { status: 'down', latencyMs: Date.now() - start, error: err.message };
  }
}
