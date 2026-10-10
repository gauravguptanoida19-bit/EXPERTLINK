import request from 'supertest';
import { createApp } from '../src/app';

describe('OpenAPI & Swagger Documentation (Milestone 12)', () => {
  const app = createApp();

  it('GET /api/docs/spec.json should return valid OpenAPI 3.0 specification', async () => {
    const res = await request(app).get('/api/docs/spec.json');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('ExpertLink API');
    expect(res.body.paths).toBeDefined();

    // Verify key paths are documented
    expect(res.body.paths['/api/auth/register']).toBeDefined();
    expect(res.body.paths['/api/auth/login']).toBeDefined();
    expect(res.body.paths['/api/experts']).toBeDefined();
    expect(res.body.paths['/api/experts/search/hybrid']).toBeDefined();
    expect(res.body.paths['/api/queries']).toBeDefined();
    expect(res.body.paths['/api/queries/{id}/match']).toBeDefined();
    expect(res.body.paths['/api/bookings']).toBeDefined();
    expect(res.body.paths['/api/feedback/suggestion']).toBeDefined();
    expect(res.body.paths['/api/assistant/structure-query']).toBeDefined();
    expect(res.body.paths['/api/analytics/overview']).toBeDefined();
  });

  it('GET /api/docs should serve Swagger UI interface', async () => {
    const res = await request(app).get('/api/docs/');

    // Swagger UI either returns 200 with HTML or 301 redirect
    expect([200, 301, 302]).toContain(res.status);
    if (res.status === 200) {
      expect(res.text).toContain('swagger-ui');
    }
  });
});
