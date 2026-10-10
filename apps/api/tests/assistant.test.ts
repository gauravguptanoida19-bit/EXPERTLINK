import request from 'supertest';
import { createApp } from '../src/app';
import { inMemoryAuthStore } from '../src/modules/auth/auth.repository';
import { inMemoryQueryStore } from '../src/modules/queries/query.repository';
import { inMemoryExpertStore } from '../src/modules/experts/expert.repository';

describe('AI Query Assistant & Expert Briefing (Milestone 10)', () => {
  const app = createApp();
  let clientToken: string;
  let queryId: string;
  let expertId: string;

  beforeAll(async () => {
    inMemoryAuthStore.clear();
    inMemoryQueryStore.clear();
    inMemoryExpertStore.clear();

    // Register client
    const cRes = await request(app).post('/api/auth/register').send({
      name: 'Assistant Client',
      email: 'assistant.client@capital.com',
      password: 'Password123!',
      role: 'CLIENT'
    });
    clientToken = cRes.body.data.tokens.accessToken;

    // Seed expert
    expertId = 'expert-brief-target';
    inMemoryExpertStore.profiles.set(expertId, {
      id: 'doc-brief-01',
      userId: expertId,
      name: 'Dr. Battery Lead',
      headline: 'Principal Solid-State Battery Scientist',
      bio: 'Leading developer of cathode chemistry and BMS battery management systems.',
      industries: ['Electric Vehicles'],
      skills: ['Battery Chemistry', 'BMS', 'Solid-State Batteries'],
      yearsExperience: 14,
      pastEngagements: [
        { topic: 'Solid-State Electrolyte Stability', company: 'QuantumScape Advisory', year: 2023 }
      ],
      hourlyRateUsd: 450,
      availability: [],
      embedding: new Array(384).fill(0.02),
      rating: 4.9,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Seed query
    const qRes = await request(app)
      .post('/api/queries')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        title: 'EV solid-state battery due diligence',
        description: 'Assessing cell chemistry and BMS architectures for next-generation platforms.',
        industry: 'Electric Vehicles',
        budgetUsd: 2000
      });
    queryId = qRes.body.data.id;
  });

  it('POST /api/assistant/structure-query should turn vague request into structured query with clarifying questions', async () => {
    const rawText = 'We need advice on building solid state batteries for electric vehicles and fast charging bms telemetry';
    const res = await request(app)
      .post('/api/assistant/structure-query')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ rawText });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.industry).toBe('Electric Vehicles');
    expect(data.skills).toContain('Battery Chemistry');
    expect(data.clarifyingQuestions).toBeInstanceOf(Array);
    expect(data.clarifyingQuestions.length).toBeGreaterThanOrEqual(2);
    expect(data).toHaveProperty('title');
    expect(data).toHaveProperty('budgetRecommendationUsd');
    expect(['LLM', 'RULE_BASED_FALLBACK']).toContain(data.source);
  });

  it('POST /api/assistant/structure-query should reject text shorter than 10 characters', async () => {
    const res = await request(app)
      .post('/api/assistant/structure-query')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ rawText: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/assistant/expert-brief should generate executive summary, agenda, and pitfalls', async () => {
    const res = await request(app)
      .post('/api/assistant/expert-brief')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        queryId,
        expertId
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const brief = res.body.data;
    expect(brief).toHaveProperty('executiveSummary');
    expect(brief.executiveSummary).toContain('Dr. Battery Lead');
    expect(brief.recommendedAgenda).toBeInstanceOf(Array);
    expect(brief.recommendedAgenda.length).toBeGreaterThanOrEqual(3);
    expect(brief.potentialPitfallsToExplore).toBeInstanceOf(Array);
    expect(brief.relevantExpertHighlights).toBeInstanceOf(Array);
    expect(brief.relevantExpertHighlights.some((h: string) => h.includes('QuantumScape'))).toBe(true);
  });
});
