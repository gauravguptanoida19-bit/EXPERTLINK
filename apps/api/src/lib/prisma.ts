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

let isPrismaAvailableState = false;
let lastPrismaProbe = 0;

export function isPrismaAvailable(): boolean {
  return isPrismaAvailableState;
}

export function setPrismaAvailable(status: boolean): void {
  isPrismaAvailableState = status;
}

export async function checkPrismaHealth(): Promise<{ status: 'up' | 'down'; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    if (typeof prisma.$queryRaw === 'function') {
      await prisma.$queryRaw`SELECT 1`;
      isPrismaAvailableState = true;
      return { status: 'up', latencyMs: Date.now() - start };
    }
    isPrismaAvailableState = true;
    return { status: 'up', latencyMs: 0 };
  } catch (err: any) {
    isPrismaAvailableState = false;
    return { status: 'down', latencyMs: Date.now() - start, error: err.message };
  }
}

export async function tryPrisma<T>(fn: () => Promise<T>, fallbackFn: () => Promise<T> | T): Promise<T> {
  if (process.env.NODE_ENV === 'test') {
    return fallbackFn();
  }

  const now = Date.now();
  // Fast fail to fallback if database was unreachable recently (probes every 30s)
  if (!isPrismaAvailableState && now - lastPrismaProbe < 30000 && lastPrismaProbe > 0) {
    return fallbackFn();
  }

  try {
    lastPrismaProbe = now;
    const result = await fn();
    isPrismaAvailableState = true;
    return result;
  } catch (err: any) {
    if (err?.message?.includes("Can't reach database server") || err?.name === 'PrismaClientInitializationError') {
      isPrismaAvailableState = false;
    }
    return fallbackFn();
  }
}
