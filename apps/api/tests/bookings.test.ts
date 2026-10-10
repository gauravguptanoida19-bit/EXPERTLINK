import request from 'supertest';
import { createApp } from '../src/app';
import { inMemoryAuthStore } from '../src/modules/auth/auth.repository';
import { inMemoryBookingStore } from '../src/modules/bookings/booking.repository';
import { inMemoryQueryStore } from '../src/modules/queries/query.repository';

describe('Safe Bookings Engine & Analytics (Milestone 7)', () => {
  const app = createApp();
  let clientToken: string;
  let client2Token: string;
  let expertToken: string;
  let adminToken: string;
  let expertId: string;
  let queryId: string;

  beforeAll(async () => {
    inMemoryAuthStore.clear();
    inMemoryBookingStore.clear();
    inMemoryQueryStore.clear();

    // Client 1
    const c1Res = await request(app).post('/api/auth/register').send({
      name: 'Client Alpha',
      email: 'alpha@capital.com',
      password: 'Password123!',
      role: 'CLIENT'
    });
    clientToken = c1Res.body.data.tokens.accessToken;

    // Client 2
    const c2Res = await request(app).post('/api/auth/register').send({
      name: 'Client Beta',
      email: 'beta@fund.com',
      password: 'Password123!',
      role: 'CLIENT'
    });
    client2Token = c2Res.body.data.tokens.accessToken;

    // Expert
    const expRes = await request(app).post('/api/auth/register').send({
      name: 'Dr. Expert User',
      email: 'expert.user@consulting.com',
      password: 'Password123!',
      role: 'EXPERT'
    });
    expertToken = expRes.body.data.tokens.accessToken;
    expertId = expRes.body.data.user.id;

    // Admin
    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'Platform Auditor',
      email: 'admin.auditor@expertlink.local',
      password: 'Password123!',
      role: 'ADMIN'
    });
    adminToken = adminRes.body.data.tokens.accessToken;

    // Create research query
    const qRes = await request(app)
      .post('/api/queries')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        title: 'Quantum computing error correction architecture',
        description: 'Need consultation on logical qubit scaling and surface codes.',
        industry: 'Semiconductors',
        budgetUsd: 1500
      });
    queryId = qRes.body.data.id;
  });

  it('POST /api/bookings with Idempotency-Key should return existing booking on retry', async () => {
    const idempotencyKey = 'idemp-key-test-12345';
    const scheduledAt = '2026-11-01T10:00:00.000Z';

    const payload = {
      queryId,
      expertId,
      scheduledAt,
      durationMin: 60,
      ratePerHourUsd: 450
    };

    // First request
    const res1 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    const bookingId = res1.body.data.id;

    // Repeated request with exact same idempotency key
    const res2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res2.status).toBe(200);
    expect(res2.body.idempotentReplay).toBe(true);
    expect(res2.body.data.id).toBe(bookingId);
  });

  it('Double-booking prevention: simultaneous booking for same expert & slot should reject second with 409 Conflict', async () => {
    const scheduledAt = '2026-11-05T15:00:00.000Z';

    const payload = {
      queryId,
      expertId,
      scheduledAt,
      durationMin: 60,
      ratePerHourUsd: 450
    };

    // Client 1 books slot
    const res1 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(payload);

    expect(res1.status).toBe(201);

    // Client 2 attempts to book the SAME expert at the SAME slot
    const res2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${client2Token}`)
      .send(payload);

    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('CONFLICT');
    expect(res2.body.error.message).toContain('already booked');
  });

  it('PATCH /api/bookings/:id/status should update booking status', async () => {
    const listRes = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`);

    const bookingId = listRes.body.data[0].id;

    const patchRes = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ status: 'CONFIRMED' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe('CONFIRMED');
  });

  it('POST /api/bookings/availability should allow EXPERT to publish slots', async () => {
    const res = await request(app)
      .post('/api/bookings/availability')
      .set('Authorization', `Bearer ${expertToken}`)
      .send({
        slots: [
          { scheduledAt: '2026-11-10T14:00:00.000Z', durationMin: 60 },
          { scheduledAt: '2026-11-10T16:00:00.000Z', durationMin: 60 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(2);

    const getRes = await request(app).get(`/api/bookings/availability/${expertId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data).toHaveLength(2);
  });

  it('POST /api/bookings/admin/expire-pending should expire pending bookings older than 24 hours', async () => {
    // Inject a pending booking created 30 hours ago into inMemory store
    const oldDate = new Date(Date.now() - 30 * 60 * 60 * 1000);
    inMemoryBookingStore.bookings.set('old-pending-booking', {
      id: 'old-pending-booking',
      queryId,
      expertId,
      clientId: 'client-1',
      scheduledAt: new Date('2026-12-01T10:00:00.000Z'),
      durationMin: 60,
      status: 'PENDING',
      ratePerHourUsd: 400,
      idempotencyKey: null,
      createdAt: oldDate,
      updatedAt: oldDate
    });

    const expireRes = await request(app)
      .post('/api/bookings/admin/expire-pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(expireRes.status).toBe(200);
    expect(expireRes.body.expiredCount).toBeGreaterThanOrEqual(1);

    const check = inMemoryBookingStore.bookings.get('old-pending-booking');
    expect(check?.status).toBe('CANCELLED');
  });

  it('GET /api/analytics/overview should return platform analytics to ADMIN', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data).toHaveProperty('totalQueries');
    expect(data).toHaveProperty('totalBookings');
    expect(data).toHaveProperty('matchAcceptanceRatePercent');
    expect(data).toHaveProperty('avgHoursToBooking');
    expect(data).toHaveProperty('queryVolumePerDay');
    expect(data).toHaveProperty('topIndustries');
    expect(data.queryVolumePerDay).toBeInstanceOf(Array);
  });
});
