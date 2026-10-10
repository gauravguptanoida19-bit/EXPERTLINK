import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/request-id';
import { errorHandler, NotFoundError } from './middleware/error-handler';
import { healthRouter, metricsRouter } from './modules/health/health.router';
import { authRouter } from './modules/auth/auth.router';
import { expertRouter } from './modules/experts/expert.router';
import { queryRouter, jobsRouter } from './modules/queries/query.router';
import { bookingRouter } from './modules/bookings/booking.router';
import { analyticsRouter } from './modules/analytics/analytics.router';
import { notificationRouter } from './modules/notifications/notification.router';

export function createApp() {
  const app = express();

  // Security headers & CORS
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      const allowedOrigins = [env.CORS_ORIGIN, 'http://localhost:4200', 'http://127.0.0.1:4200'];
      if (allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key']
  }));

  // Request sizing limits (Security hardening #8)
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Correlation & Request ID logging
  app.use(requestIdMiddleware);

  // Prometheus Metrics endpoint
  app.use(metricsRouter);

  // Health check routes
  app.use('/api', healthRouter);

  // Authentication & RBAC routes
  app.use('/api/auth', authRouter);

  // Expert Profiles routes
  app.use('/api/experts', expertRouter);

  // Research Queries & Matching routes
  app.use('/api/queries', queryRouter);

  // Async Background Jobs routes
  app.use('/api/jobs', jobsRouter);

  // Bookings Engine routes
  app.use('/api/bookings', bookingRouter);

  // Analytics routes
  app.use('/api/analytics', analyticsRouter);

  // Notifications routes
  app.use('/api/notifications', notificationRouter);

  // Placeholder for modular routes (queries, experts, matching, bookings, etc.)
  // These will be mounted in their respective milestones

  // 404 handler for undefined routes
  app.use('/api/*', (req, _res, next) => {
    next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
  });

  // Global standardized error handler
  app.use(errorHandler);

  return app;
}
