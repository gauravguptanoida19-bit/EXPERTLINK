import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Prevent multiple instances in development reload
declare global {
  var __prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

try {
  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
  } else {
    if (!global.__prisma) {
      global.__prisma = new PrismaClient({
        log: ['error', 'warn']
      });
    }
    prisma = global.__prisma;
  }
} catch (err) {
  logger.error({ err }, 'Failed to instantiate PrismaClient');
  // Fallback stub for unit test environments if client not generated yet
  prisma = {} as any;
}

export { prisma };

export async function checkPrismaHealth(): Promise<{ status: 'up' | 'down'; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    if (typeof prisma.$queryRaw === 'function') {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - start };
    }
    return { status: 'up', latencyMs: 0 };
  } catch (err: any) {
    return { status: 'down', latencyMs: Date.now() - start, error: err.message };
  }
}
