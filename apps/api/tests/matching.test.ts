import request from 'supertest';
import { createApp } from '../src/app';
import { inMemoryAuthStore } from '../src/modules/auth/auth.repository';
import { inMemoryQueryStore } from '../src/modules/queries/query.repository';
import { inMemoryExpertStore } from '../src/modules/experts/expert.repository';

describe('Job Pipeline, Queries & Matching Engine (Milestone 5)', () => {
  const app = createApp();
  let clientToken: string;
  let adminToken: string;
  let queryId: string;

  beforeAll(async () => {
    inMemoryAuthStore.clear();
    inMemoryQueryStore.clear();
    inMemoryExpertStore.clear();

    // Register client
    const clientRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Venture Capitalist',
        email: 'vc@sequoia-lookalike.com',
        password: 'Password123!',
        role: 'CLIENT'
      });
    clientToken = clientRes.body.data.tokens.accessToken;

    // Register admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'System Admin',
        email: 'admin@expertlink.local',
        password: 'Password123!',
        role: 'ADMIN'
      });
    adminToken = adminRes.body.data.tokens.accessToken;

    // Create 2 candidate experts in expert store
    inMemoryExpertStore.profiles.set('exp-1', {
      id: 'doc-1',
      userId: 'exp-1',
      name: 'Dr. Semiconductor Architect',
      email: 'semi@intel.com',
      headline: 'Principal Lithography & ASIC Architect',
      bio: 'EUV lithography, 2nm node packaging, and custom ASIC acceleration.',
      industries: ['Semiconductors', 'Artificial Intelligence'],
      skills: ['EUV Lithography', 'ASIC Design', 'Packaging'],
      yearsExperience: 18,
      pastEngagements: [{ topic: '2nm Foundry Due Diligence', company: 'TSMC Partner', year: 2023 }],
      hourlyRateUsd: 600,
      availability: [],
      embedding: new Array(384).fill(0.05),
      rating: 4.95,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    inMemoryExpertStore.profiles.set('exp-2', {
      id: 'doc-2',
      userId: 'exp-2',
      name: 'Bioinformatics Lead',
      email: 'bio@genomics.org',
      headline: 'CRISPR Screening Specialist',
      bio: 'High throughput gene therapy screening.',
      industries: ['Biotechnology'],
      skills: ['CRISPR', 'Genomics'],
      yearsExperience: 8,
      pastEngagements: [],
      hourlyRateUsd: 350,
      availability: [],
      embedding: new Array(384).fill(-0.02),
      rating: 4.4,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  it('POST /api/queries should create a research query for CLIENT', async () => {
    const res = await request(app)
      .post('/api/queries')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        title: 'ASIC accelerator design and EUV roadmap analysis',
        description: 'Comprehensive technical review of sub-3nm node yields, EUV optics limitations, and domain-specific ASIC performance.',
        industry: 'Semiconductors',
        budgetUsd: 2500
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toContain('ASIC accelerator');
    expect(res.body.data.status).toBe('OPEN');
    queryId = res.body.data.id;
  });

  it('GET /api/queries should return client queries', async () => {
    const res = await request(app)
      .get('/api/queries')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].id).toBe(queryId);
  });

  it('POST /api/queries/:id/match should return 202 Accepted with a background jobId', async () => {
    const res = await request(app)
      .post(`/api/queries/${queryId}/match`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('jobId');
    expect(res.body).toHaveProperty('statusUrl');

    const jobId = res.body.jobId;
    const statusRes = await request(app)
      .get(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.id).toBe(jobId);
    expect(statusRes.body.data).toHaveProperty('state');
    expect(statusRes.body.data).toHaveProperty('progress');
  });

  it('POST /api/queries/:id/match?sync=true should return scored experts with explanations and cache result', async () => {
    // Create dedicated query for cache test
    const qRes = await request(app)
      .post('/api/queries')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        title: 'Semiconductor lithography due diligence',
        description: 'Analysis of EUV lithography and advanced packaging technologies.',
        industry: 'Semiconductors',
        budgetUsd: 1800
      });
    const cacheTestQueryId = qRes.body.data.id;

    // 1st request: cold cache
    const res1 = await request(app)
      .post(`/api/queries/${cacheTestQueryId}/match?sync=true`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.cached).toBe(false);
    expect(res1.body.data.matches.length).toBeGreaterThanOrEqual(1);

    const top = res1.body.data.matches[0];
    expect(top.expertId).toBe('exp-1'); // Dr. Semiconductor
    expect(top.score).toBeGreaterThan(0.5);
    expect(top.explanation.industryOverlap).toBe(true);
    expect(top.subScores).toHaveProperty('semanticSimilarity');
    expect(top.subScores).toHaveProperty('bookingLikelihood');

    // 2nd request: warm cache hit
    const res2 = await request(app)
      .post(`/api/queries/${cacheTestQueryId}/match?sync=true`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.data.cached).toBe(true);
    expect(res2.body.data.matches[0].expertId).toBe('exp-1');
  });

  it('GET /api/queries/:id should now show MATCHED status with persisted matches', async () => {
    const res = await request(app)
      .get(`/api/queries/${queryId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('MATCHED');
    expect(res.body.data.matches.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/jobs/admin/queue-health should report queue metrics to admin', async () => {
    const res = await request(app)
      .get('/api/jobs/admin/queue-health')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status', 'healthy');
    expect(res.body.data).toHaveProperty('counts');
  });
});
