import request from 'supertest';
import { createApp } from '../src/app';
import { inMemoryAuthStore } from '../src/modules/auth/auth.repository';
import { inMemoryExpertStore } from '../src/modules/experts/expert.repository';

describe('Expert Profiles & CRUD APIs (Milestone 3)', () => {
  const app = createApp();
  let expertToken: string;
  let expertUserId: string;
  let clientToken: string;

  beforeEach(async () => {
    inMemoryAuthStore.clear();
    inMemoryExpertStore.clear();

    // Register expert
    const expertRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Dr. Katherine Johnson',
        email: 'kjohnson@orbital.org',
        password: 'Password123!',
        role: 'EXPERT'
      });
    expertToken = expertRes.body.data.tokens.accessToken;
    expertUserId = expertRes.body.data.user.id;

    // Register client
    const clientRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Investor Dave',
        email: 'dave@capital.com',
        password: 'Password123!',
        role: 'CLIENT'
      });
    clientToken = clientRes.body.data.tokens.accessToken;
  });

  it('PUT /api/experts/me as EXPERT should update profile and re-generate 384-dim embedding', async () => {
    const payload = {
      headline: 'Principal Aerospace Navigation & Trajectory Specialist',
      bio: 'Pioneered computational orbital mechanics and trajectory optimization with over two decades of aerospace consulting experience.',
      industries: ['Artificial Intelligence', 'Cloud Infrastructure'],
      skills: ['Orbital Mechanics', 'Numerical Analysis', 'Python', 'Simulation'],
      yearsExperience: 22,
      pastEngagements: [
        {
          topic: 'Project Mercury Trajectory Verification',
          company: 'NASA Advisory',
          year: 2021
        }
      ],
      hourlyRateUsd: 450,
      availability: ['2026-10-15T14:00:00Z', '2026-10-16T10:00:00Z']
    };

    const res = await request(app)
      .put('/api/experts/me')
      .set('Authorization', `Bearer ${expertToken}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.headline).toBe(payload.headline);
    expect(res.body.data.hourlyRateUsd).toBe(450);
    expect(res.body.data.pastEngagements).toHaveLength(1);
    expect(res.body.data.embedding).toBeInstanceOf(Array);
    expect(res.body.data.embedding.length).toBe(384);
  });

  it('PUT /api/experts/me as CLIENT should be rejected with 403 Forbidden', async () => {
    const res = await request(app)
      .put('/api/experts/me')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        headline: 'Should not allow client',
        bio: 'Client cannot be an expert profile editor',
        industries: ['Fintech'],
        skills: ['Investing'],
        yearsExperience: 5,
        hourlyRateUsd: 100
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/experts/:id should return the expert profile', async () => {
    // Populate expert profile first
    await request(app)
      .put('/api/experts/me')
      .set('Authorization', `Bearer ${expertToken}`)
      .send({
        headline: 'Quantum Computing Senior Architect',
        bio: 'Specialist in superconducting qubits, error correction, and quantum algorithms.',
        industries: ['Semiconductors'],
        skills: ['Quantum Algorithms', 'Superconducting Circuits'],
        yearsExperience: 12,
        hourlyRateUsd: 500,
        availability: []
      });

    const res = await request(app).get(`/api/experts/${expertUserId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBe(expertUserId);
    expect(res.body.data.headline).toBe('Quantum Computing Senior Architect');
  });

  it('GET /api/experts/:id should return 404 for unknown expert', async () => {
    const res = await request(app).get('/api/experts/non-existent-user-id');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/experts should return list of experts with pagination and filtering', async () => {
    // Create expert profile
    await request(app)
      .put('/api/experts/me')
      .set('Authorization', `Bearer ${expertToken}`)
      .send({
        headline: 'Autonomous Driving & Computer Vision Lead',
        bio: 'Deep neural networks for perception, LiDAR fusion, and edge deployment.',
        industries: ['Electric Vehicles', 'Artificial Intelligence'],
        skills: ['Computer Vision', 'PyTorch', 'LiDAR'],
        yearsExperience: 14,
        hourlyRateUsd: 380,
        availability: []
      });

    const listRes = await request(app).get('/api/experts?limit=5');
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.pagination).toHaveProperty('total', 1);

    // Filter matching industry
    const matchRes = await request(app).get('/api/experts?industry=Electric Vehicles');
    expect(matchRes.body.data).toHaveLength(1);

    // Filter unmatching industry
    const unmatchRes = await request(app).get('/api/experts?industry=Biotechnology');
    expect(unmatchRes.body.data).toHaveLength(0);

    // Search text
    const searchRes = await request(app).get('/api/experts?search=LiDAR');
    expect(searchRes.body.data).toHaveLength(1);
  });
});
