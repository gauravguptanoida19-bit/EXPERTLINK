import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../src/app';
import { inMemoryAuthStore } from '../src/modules/auth/auth.repository';
import { inMemoryFeedbackStore } from '../src/modules/feedback/feedback.repository';
import { inMemoryBookingStore } from '../src/modules/bookings/booking.repository';
import { inMemoryExpertStore } from '../src/modules/experts/expert.repository';

describe('Feedback Loop & Retraining Engine (Milestone 9)', () => {
  const app = createApp();
  let clientToken: string;
  let adminToken: string;
  let expertId: string;
  let queryId: string;
  let bookingId: string;

  beforeAll(async () => {
    inMemoryAuthStore.clear();
    inMemoryFeedbackStore.clear();
    inMemoryBookingStore.clear();
    inMemoryExpertStore.clear();

    // Client
    const cRes = await request(app).post('/api/auth/register').send({
      name: 'Feedback Client',
      email: 'fb.client@capital.com',
      password: 'Password123!',
      role: 'CLIENT'
    });
    clientToken = cRes.body.data.tokens.accessToken;
    const clientId = cRes.body.data.user.id;

    // Admin
    const aRes = await request(app).post('/api/auth/register').send({
      name: 'ML Ops Admin',
      email: 'mlops@expertlink.local',
      password: 'Password123!',
      role: 'ADMIN'
    });
    adminToken = aRes.body.data.tokens.accessToken;

    // Expert
    expertId = 'expert-review-01';
    inMemoryExpertStore.profiles.set(expertId, {
      id: 'doc-exp-01',
      userId: expertId,
      name: 'Dr. Feedback Target',
      headline: 'Deep Tech Advisor',
      bio: 'Deep tech consulting.',
      industries: ['Artificial Intelligence'],
      skills: ['MLOps'],
      yearsExperience: 10,
      pastEngagements: [],
      hourlyRateUsd: 300,
      availability: [],
      embedding: new Array(384).fill(0.01),
      rating: 5.0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    queryId = 'query-feedback-01';
    bookingId = 'booking-feedback-01';

    // Seed completed booking
    inMemoryBookingStore.bookings.set(bookingId, {
      id: bookingId,
      queryId,
      expertId,
      clientId,
      scheduledAt: new Date('2026-11-15T10:00:00Z'),
      durationMin: 60,
      status: 'COMPLETED',
      ratePerHourUsd: 300,
      idempotencyKey: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  it('POST /api/feedback/suggestion should record relevance rating for a suggested expert', async () => {
    const res = await request(app)
      .post('/api/feedback/suggestion')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        queryId,
        expertId,
        relevance: 'RELEVANT',
        notes: 'Highly relevant background in MLOps pipelines.'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.relevance).toBe('RELEVANT');
    expect(res.body.data.expertId).toBe(expertId);
  });

  it('POST /api/feedback/consultation should record 5-star review and update expert rating', async () => {
    const res = await request(app)
      .post('/api/feedback/consultation')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        bookingId,
        rating: 5,
        notes: 'Outstanding advisory session, solved our model latency bottleneck.'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(5);

    // Verify GET /api/feedback/expert/:expertId
    const getRes = await request(app).get(`/api/feedback/expert/${expertId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.averageRating).toBe(5);
    expect(getRes.body.data.totalFeedbackCount).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/feedback/admin/retrain-now should retrain ranker and log metrics to docs/ml-evaluation.md', async () => {
    const res = await request(app)
      .post('/api/feedback/admin/retrain-now')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('version');
    expect(res.body.data).toHaveProperty('precisionAt5');
    expect(res.body.data).toHaveProperty('ndcgAt10');

    // Verify evaluation doc
    const evalPath = path.resolve(process.cwd(), '../../docs/ml-evaluation.md');
    expect(fs.existsSync(evalPath)).toBe(true);
    const content = fs.readFileSync(evalPath, 'utf-8');
    expect(content).toContain(res.body.data.version);
    expect(content).toContain('Precision@5');
    expect(content).toContain('NDCG@10');
  });
});
