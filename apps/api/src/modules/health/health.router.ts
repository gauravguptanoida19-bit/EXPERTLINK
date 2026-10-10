import { Router, Request, Response } from 'express';
import { checkPrismaHealth } from '../../lib/prisma';
import { checkMongoHealth } from '../../lib/mongo';
import { checkRedisHealth } from '../../lib/redis';
import { checkMlServiceHealth } from '../../lib/ml-client';
import { register } from '../../lib/metrics';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const [postgres, mongo, redis, mlService] = await Promise.all([
    checkPrismaHealth(),
    checkMongoHealth(),
    checkRedisHealth(),
    checkMlServiceHealth()
  ]);

  const allUp = [postgres, mongo, redis, mlService].every((s) => s.status === 'up');

  res.status(allUp ? 200 : 200).json({
    status: allUp ? 'healthy' : 'degraded',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      api: { status: 'up' },
      postgres,
      mongo,
      redis,
      mlService
    }
  });
});

router.get('/health/liveness', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

router.get('/health/readiness', async (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ready' });
});

export const healthRouter = router;

export const metricsRouter = Router();
metricsRouter.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err: any) {
    res.status(500).end(err.message);
  }
});
