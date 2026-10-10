import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger';
import { httpRequestDurationHistogram } from '../lib/metrics';

declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: bigint;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqId = (req.header('X-Request-Id') as string) || uuidv4();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  req.startTime = process.hrtime.bigint();

  const reqLogger = logger.child({ requestId: reqId });
  (req as any).log = reqLogger;

  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - req.startTime;
    const elapsedSeconds = Number(elapsedNs) / 1e9;
    const route = req.route?.path || req.baseUrl || req.path;

    httpRequestDurationHistogram.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode.toString()
      },
      elapsedSeconds
    );

    reqLogger.info({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: (Number(elapsedNs) / 1e6).toFixed(2)
    }, `HTTP ${req.method} ${req.originalUrl} finished with ${res.statusCode}`);
  });

  next();
}
