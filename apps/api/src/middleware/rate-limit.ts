import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';
import { env } from '../config/env';

interface RateLimitOptions {
  windowSec: number;
  maxRequests: number;
  prefix?: string;
}

const memoryRateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(options: RateLimitOptions) {
  const { windowSec, maxRequests, prefix = 'rl' } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limits in test environment to avoid test flakiness
    if (env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${prefix}:${ip}`;
    const now = Math.floor(Date.now() / 1000);

    try {
      if (redis.status === 'ready') {
        const current = await redis.incr(key);
        if (current === 1) {
          await redis.expire(key, windowSec);
        }
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

        if (current > maxRequests) {
          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests, please try again later.',
              retryAfterSeconds: windowSec,
              requestId: req.id
            }
          });
        }
        return next();
      }
    } catch (_) {
      // Fallback to in-memory store
    }

    // In-memory fallback
    const entry = memoryRateLimitStore.get(key);
    if (!entry || entry.resetAt <= now) {
      memoryRateLimitStore.set(key, { count: 1, resetAt: now + windowSec });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    entry.count += 1;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));

    if (entry.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
          retryAfterSeconds: entry.resetAt - now,
          requestId: req.id
        }
      });
    }

    next();
  };
}
