import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from './logger';

let isConnected = false;

export async function connectMongo(): Promise<typeof mongoose | null> {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    isConnected = true;
    logger.info('Connected to MongoDB');
    return conn;
  } catch (err: any) {
    logger.warn({ err: err.message }, 'MongoDB connection deferred/failed');
    return null;
  }
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

export async function checkMongoHealth(): Promise<{ status: 'up' | 'down'; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      return { status: 'up', latencyMs: Date.now() - start };
    }
    return { status: 'down', latencyMs: Date.now() - start, error: 'MongoDB connection not ready' };
  } catch (err: any) {
    return { status: 'down', latencyMs: Date.now() - start, error: err.message };
  }
}
