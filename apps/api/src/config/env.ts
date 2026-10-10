import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load root or local .env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config(); // fallback to current dir

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  API_BASE_URL: z.string().default('http://localhost:4000'),
  CORS_ORIGIN: z.string().default('http://localhost:4200'),
  DATABASE_URL: z.string().default('postgresql://expertlink:expertlink_secret@localhost:5432/expertlink_db?schema=public'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/expertlink_mongo'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('super-secret-jwt-key-minimum-32-chars-long-expertlink-token'),
  JWT_REFRESH_SECRET: z.string().default('super-secret-refresh-key-minimum-32-chars-long-expertlink-token'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  ML_SERVICE_URL: z.string().default('http://localhost:8000'),
  LLM_API_KEY: z.string().optional().default(''),
  LLM_MODEL: z.string().default('gemini-1.5-flash'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:', parsedEnv.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsedEnv.data;
