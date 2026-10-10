import request from 'supertest';
import { createApp } from '../src/app';
import { inMemoryAuthStore } from '../src/modules/auth/auth.repository';

describe('Authentication & RBAC (Milestone 2)', () => {
  const app = createApp();

  beforeEach(() => {
    inMemoryAuthStore.clear();
  });

  const validClient = {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    password: 'SecurePassword123!',
    role: 'CLIENT'
  };

  const validAdmin = {
    name: 'Admin Smith',
    email: 'admin.smith@example.com',
    password: 'SecurePassword123!',
    role: 'ADMIN'
  };

  it('POST /api/auth/register should create user and return tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validClient);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validClient.email);
    expect(res.body.data.user.role).toBe('CLIENT');
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('POST /api/auth/register should reject weak passwords with 400 validation error', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        ...validClient,
        password: 'weak'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/auth/register should reject duplicate emails with 409 conflict', async () => {
    await request(app).post('/api/auth/register').send(validClient);
    const res = await request(app).post('/api/auth/register').send(validClient);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('POST /api/auth/login should authenticate valid user', async () => {
    await request(app).post('/api/auth/register').send(validClient);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: validClient.email,
        password: validClient.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.user.email).toBe(validClient.email);
  });

  it('POST /api/auth/login should fail with invalid password', async () => {
    await request(app).post('/api/auth/register').send(validClient);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: validClient.email,
        password: 'WrongPassword123!'
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/auth/refresh should rotate refresh token and revoke previous', async () => {
    const regRes = await request(app).post('/api/auth/register').send(validClient);
    const originalRefreshToken = regRes.body.data.tokens.refreshToken;

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: originalRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data).toHaveProperty('accessToken');
    expect(refreshRes.body.data).toHaveProperty('refreshToken');

    const newRefreshToken = refreshRes.body.data.refreshToken;
    expect(newRefreshToken).not.toBe(originalRefreshToken);

    // Replay attack / token reuse: attempt to reuse the rotated old token
    const reuseRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: originalRefreshToken });

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error.message).toContain('reuse detected');
  });

  it('GET /api/auth/me should return current user profile when authenticated', async () => {
    const regRes = await request(app).post('/api/auth/register').send(validClient);
    const token = regRes.body.data.tokens.accessToken;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(validClient.email);
    expect(meRes.body.data.role).toBe('CLIENT');
  });

  it('GET /api/auth/me without token should return 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('RBAC: non-admin should get 403 on admin-only route, admin should get 200', async () => {
    // Client token
    const clientRes = await request(app).post('/api/auth/register').send(validClient);
    const clientToken = clientRes.body.data.tokens.accessToken;

    const forbiddenRes = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');

    // Admin token
    const adminRes = await request(app).post('/api/auth/register').send(validAdmin);
    const adminToken = adminRes.body.data.tokens.accessToken;

    const successRes = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);
    expect(successRes.body.message).toBe('Welcome Admin');
  });
});
