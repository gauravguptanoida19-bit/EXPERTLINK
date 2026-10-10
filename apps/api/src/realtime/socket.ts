import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { authService, JwtPayload } from '../modules/auth/auth.service';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: JwtPayload;
  };
}

let io: Server | null = null;

export function initSocketIO(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: [env.CORS_ORIGIN, 'http://localhost:4200', 'http://127.0.0.1:4200'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // JWT Authentication Middleware for WebSockets
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;

      if (!authHeader) {
        return next(new Error('Authentication error: Missing token'));
      }

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : authHeader;

      const payload = authService.verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch (err: any) {
      next(new Error(`Authentication error: ${err.message}`));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    if (user) {
      const userRoom = `user:${user.userId}`;
      socket.join(userRoom);
      logger.info({ userId: user.userId, socketId: socket.id }, 'Socket connected and joined user room');

      // Join query room listener
      socket.on('join:query', (queryId: string) => {
        socket.join(`query:${queryId}`);
      });

      // Join booking room listener
      socket.on('join:booking', (bookingId: string) => {
        socket.join(`booking:${bookingId}`);
      });
    }

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, 'Socket disconnected');
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

/**
 * Emit live match progress to client's personal room & query room
 */
export function emitMatchProgress(data: {
  userId: string;
  queryId: string;
  step: 'embedding' | 'ranking' | 'done';
  progress: number;
  message: string;
}) {
  if (!io) return;
  io.to(`user:${data.userId}`).emit('match:progress', data);
  io.to(`query:${data.queryId}`).emit('match:progress', data);
}

/**
 * Emit instant booking updates to client and expert
 */
export function emitBookingUpdate(data: {
  clientId: string;
  expertId: string;
  bookingId: string;
  status: string;
  scheduledAt: string;
  message: string;
}) {
  if (!io) return;
  io.to(`user:${data.clientId}`).emit('booking:update', data);
  io.to(`user:${data.expertId}`).emit('booking:update', data);
  io.to(`booking:${data.bookingId}`).emit('booking:update', data);
}

/**
 * Emit generic notification to user
 */
export function emitNotification(userId: string, notification: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', notification);
}
