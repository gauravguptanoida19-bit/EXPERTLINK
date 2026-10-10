import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { connectMongo, disconnectMongo } from './lib/mongo';
import { redis } from './lib/redis';
import { initSocketIO } from './realtime/socket';

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize Socket.IO gateway
  initSocketIO(server);

  // Initialize DBs
  await connectMongo();

  server.listen(env.PORT, () => {
    logger.info(`ExpertLink API listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    logger.info(`Health check available at http://localhost:${env.PORT}/api/health`);
    logger.info(`Prometheus metrics available at http://localhost:${env.PORT}/metrics`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, initiating graceful shutdown...`);
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await disconnectMongo();
        await redis.quit();
        logger.info('Cleaned up database and cache connections');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown cleanup');
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forcefully terminating process due to shutdown timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    logger.error({ err }, 'Fatal error during application startup');
    process.exit(1);
  });
}
