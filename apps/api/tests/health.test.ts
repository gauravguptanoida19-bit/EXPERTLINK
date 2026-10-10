import request from 'supertest';
import { createApp } from '../src/app';

describe('Health and Monitoring Endpoints (Milestone 1)', () => {
  const app = createApp();

  it('GET /api/health should return 200 with service health status and timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(res.body).toHaveProperty('services');
    expect(res.body.services).toHaveProperty('api');
    expect(res.body.services.api.status).toBe('up');
  });

  it('GET /api/health/liveness should return 200 alive', async () => {
    const res = await request(app).get('/api/health/liveness');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'alive' });
  });

  it('GET /api/health/readiness should return 200 ready', async () => {
    const res = await request(app).get('/api/health/readiness');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready' });
  });

  it('GET /metrics should export Prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('expertlink_');
  });

  afterAll(async () => {
    const { redis } = await import('../src/lib/redis');
    const { disconnectMongo } = await import('../src/lib/mongo');
    try {
      if (redis.status === 'ready' || redis.status === 'connecting') {
        await redis.quit();
      } else {
        redis.disconnect();
      }
      await disconnectMongo();
    } catch (_) {}
  });

  it('GET /api/nonexistent should return 404 with standardized error schema', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error).toHaveProperty('requestId');
  });
});
