import request from 'supertest';
import { createApp } from '../src/app';
import { inMemoryExpertStore } from '../src/modules/experts/expert.repository';
import {
  levenshteinDistance,
  findTypoCorrections
} from '../src/modules/experts/hybrid-search.service';

describe('Hybrid Search Engine (Milestone 6)', () => {
  const app = createApp();

  beforeAll(() => {
    inMemoryExpertStore.clear();

    // Expert 1: AI Specialist
    inMemoryExpertStore.profiles.set('expert-ai-1', {
      id: 'doc-ai-1',
      userId: 'expert-ai-1',
      name: 'Dr. Geoffrey Hinton',
      headline: 'Deep Learning & PyTorch Specialist',
      bio: 'Pioneered backpropagation, neural networks, and transformer fine-tuning.',
      industries: ['Artificial Intelligence'],
      skills: ['PyTorch', 'Transformers', 'Large Language Models'],
      yearsExperience: 25,
      pastEngagements: [{ topic: 'Deep Learning Architectures', company: 'Google Brain', year: 2022 }],
      hourlyRateUsd: 650,
      availability: [],
      embedding: new Array(384).fill(0.08),
      rating: 5.0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Expert 2: Biotech CRISPR Specialist
    inMemoryExpertStore.profiles.set('expert-bio-2', {
      id: 'doc-bio-2',
      userId: 'expert-bio-2',
      name: 'Dr. Jennifer Doudna',
      headline: 'CRISPR Gene Editing Pioneer',
      bio: 'Nobel laureate specializing in CRISPR and clinical genomics discovery.',
      industries: ['Biotechnology'],
      skills: ['CRISPR', 'Genomics', 'Bioinformatics'],
      yearsExperience: 20,
      pastEngagements: [{ topic: 'Gene Editing Therapeutics', company: 'Caribou Bio', year: 2021 }],
      hourlyRateUsd: 550,
      availability: [],
      embedding: new Array(384).fill(-0.05),
      rating: 4.95,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Expert 3: Kubernetes Infrastructure
    inMemoryExpertStore.profiles.set('expert-cloud-3', {
      id: 'doc-cloud-3',
      userId: 'expert-cloud-3',
      name: 'Cloud Engineer Alex',
      headline: 'Kubernetes Platform Architect',
      bio: 'Cloud native container orchestration, eBPF telemetry, and multi-region failover.',
      industries: ['Cloud Infrastructure'],
      skills: ['Kubernetes', 'Multi-cloud', 'Terraform'],
      yearsExperience: 10,
      pastEngagements: [],
      hourlyRateUsd: 250,
      availability: [],
      embedding: new Array(384).fill(0.02),
      rating: 4.7,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  it('Levenshtein distance and typo corrections should identify typos in skill names', () => {
    expect(levenshteinDistance('PyTorch', 'Pytrch')).toBe(1);
    expect(levenshteinDistance('CRISPR', 'CRSPR')).toBe(1);

    const { correctionsMap } = findTypoCorrections('I need help with Pytrch and Kubernets');
    expect(correctionsMap).toHaveProperty('Pytrch', 'PyTorch');
  });

  it('GET /api/experts/search/hybrid should execute hybrid search with RRF fusion', async () => {
    const res = await request(app).get('/api/experts/search/hybrid?q=deep learning transformer models');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.totalResults).toBe(3);
    expect(data.items.length).toBeGreaterThanOrEqual(1);

    // AI expert should rank first
    const top = data.items[0];
    expect(top.expert.userId).toBe('expert-ai-1');
    expect(top).toHaveProperty('rrfScore');
    expect(top).toHaveProperty('keywordRank');
    expect(top).toHaveProperty('semanticRank');
  });

  it('GET /api/experts/search/hybrid should tolerate typos in skill queries', async () => {
    // Query with typo "Pytrch"
    const res = await request(app).get('/api/experts/search/hybrid?q=Pytrch');
    expect(res.status).toBe(200);

    const data = res.body.data;
    expect(data.items.length).toBeGreaterThanOrEqual(1);
    expect(data.items[0].expert.userId).toBe('expert-ai-1');
    expect(data.typoSuggestions).toHaveProperty('Pytrch');
  });

  it('GET /api/experts/search/hybrid should return facet counts for industries, skills, and rate bands', async () => {
    const res = await request(app).get('/api/experts/search/hybrid?q=consultant');
    expect(res.status).toBe(200);

    const facets = res.body.data.facets;
    expect(facets).toHaveProperty('industries');
    expect(facets).toHaveProperty('skills');
    expect(facets).toHaveProperty('rateBands');

    expect(facets.industries).toHaveProperty('Artificial Intelligence', 1);
    expect(facets.industries).toHaveProperty('Biotechnology', 1);
    expect(facets.skills).toHaveProperty('CRISPR', 1);
    expect(facets.rateBands.from200to400).toBe(1); // Alex $250
    expect(facets.rateBands.from400to600).toBe(1); // Doudna $550
    expect(facets.rateBands.above600).toBe(1);     // Hinton $650
  });

  it('GET /api/experts/search/hybrid should filter by rate and industry', async () => {
    const res = await request(app).get('/api/experts/search/hybrid?industry=Biotechnology&minRate=500');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].expert.userId).toBe('expert-bio-2');
  });
});
