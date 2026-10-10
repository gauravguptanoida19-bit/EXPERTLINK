import { ExpertProfile, IExpertProfile } from './expert.model';
import { ExpertQueryFilters, UpdateExpertProfileInput } from './expert.schemas';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import mongoose from 'mongoose';

export interface ExpertProfileRecord {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  headline: string;
  bio: string;
  industries: string[];
  skills: string[];
  yearsExperience: number;
  pastEngagements: Array<{ topic: string; company: string; year: number }>;
  hourlyRateUsd: number;
  availability: string[];
  embedding: number[];
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

function generateDeterministicVector(seedString: string, dim = 384): number[] {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const vec: number[] = [];
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    const val = Math.sin(hash + i * 997);
    vec.push(val);
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vec.map((v) => Number((v / norm).toFixed(6)));
}

export const INITIAL_DEMO_EXPERTS: ExpertProfileRecord[] = [
  {
    id: 'exp_demo_001',
    userId: 'demo-expert-id-001',
    name: 'Dr. Alan Turing',
    email: 'expert@expertlink.com',
    headline: 'Principal AI Scientist & LLM Architect',
    bio: 'Over 15 years pioneering deep learning architectures, foundational LLM pretraining, and reinforcement learning alignment at top research labs.',
    industries: ['Artificial Intelligence', 'Cloud Infrastructure', 'Cybersecurity'],
    skills: ['Large Language Models', 'Transformers', 'RLHF', 'Fine-tuning', 'PyTorch', 'MLOps'],
    yearsExperience: 16,
    pastEngagements: [
      { topic: 'LLM Alignment and Safety Evaluation', company: 'DeepMind / OpenAI', year: 2024 },
      { topic: 'Distributed Training on 10k H100s', company: 'Anthropic', year: 2023 }
    ],
    hourlyRateUsd: 450,
    availability: ['Monday afternoons', 'Wednesday mornings', 'Friday anytime'],
    embedding: generateDeterministicVector('Dr. Alan Turing Artificial Intelligence Large Language Models'),
    rating: 4.95,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z')
  },
  {
    id: 'exp_demo_002',
    userId: 'demo-expert-id-002',
    name: 'Dr. Elena Rostova',
    email: 'elena.rostova@biotech-innovate.com',
    headline: 'Senior Principal Bioinformatician & CRISPR Lead',
    bio: 'Specializing in computational genomics, CRISPR-Cas9 target design, and deep learning for drug discovery.',
    industries: ['Biotechnology', 'Healthcare Systems'],
    skills: ['CRISPR', 'Genomics', 'Bioinformatics', 'Drug Discovery', 'Clinical Trials'],
    yearsExperience: 14,
    pastEngagements: [
      { topic: 'Accelerated Antibody Screening Pipeline', company: 'Genentech', year: 2023 }
    ],
    hourlyRateUsd: 400,
    availability: ['Tuesday mornings', 'Thursday afternoons'],
    embedding: generateDeterministicVector('Dr. Elena Rostova Biotechnology CRISPR Genomics'),
    rating: 4.90,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z')
  },
  {
    id: 'exp_demo_003',
    userId: 'demo-expert-id-003',
    name: 'Marcus Vance',
    email: 'm.vance@quantfunds.io',
    headline: 'Managing Director of Algorithmic Trading & DeFi Infrastructure',
    bio: '20+ years building ultra-low-latency market making engines, automated risk modeling, and institutional settlement rails.',
    industries: ['Fintech', 'Cybersecurity'],
    skills: ['Algorithmic Trading', 'Blockchain', 'Payment Rails', 'Risk Modeling', 'Credit Scoring'],
    yearsExperience: 21,
    pastEngagements: [
      { topic: 'Sub-microsecond FX Routing System', company: 'Citadel Securities', year: 2022 }
    ],
    hourlyRateUsd: 550,
    availability: ['Weekdays after market close'],
    embedding: generateDeterministicVector('Marcus Vance Fintech Algorithmic Trading Blockchain'),
    rating: 4.98,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z')
  },
  {
    id: 'exp_demo_004',
    userId: 'demo-expert-id-004',
    name: 'Sarah Lin',
    email: 'sarah.lin@semicondesign.com',
    headline: 'VP of Semiconductor Fabrication & EUV Lithography',
    bio: 'Leading sub-3nm chip tape-outs, packaging innovations, and advanced EDA tool synthesis for cutting-edge silicon.',
    industries: ['Semiconductors', 'Cloud Infrastructure'],
    skills: ['EUV Lithography', 'ASIC Design', 'Packaging', 'TSMC Process', 'EDA Tools', 'RISC-V Architecture'],
    yearsExperience: 18,
    pastEngagements: [
      { topic: 'High-Density 3nm Chiplet Packaging', company: 'NVIDIA Partner Group', year: 2024 }
    ],
    hourlyRateUsd: 500,
    availability: ['Wednesday afternoons', 'Thursday mornings'],
    embedding: generateDeterministicVector('Sarah Lin Semiconductors EUV Lithography ASIC Design'),
    rating: 4.92,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z')
  },
  {
    id: 'exp_demo_005',
    userId: 'demo-expert-id-005',
    name: 'David Kross',
    email: 'david.kross@cloudarch.dev',
    headline: 'Chief Cloud Systems Architect & Kubernetes Specialist',
    bio: 'Architecting multi-region resilient cloud infrastructures, eBPF telemetry, and zero-downtime service meshes at hyper-scale.',
    industries: ['Cloud Infrastructure', 'Cybersecurity'],
    skills: ['Kubernetes', 'Serverless', 'Multi-cloud', 'Terraform', 'eBPF', 'High Availability'],
    yearsExperience: 15,
    pastEngagements: [
      { topic: 'Global 99.999% Service Mesh Overhaul', company: 'Stripe Advisory', year: 2023 }
    ],
    hourlyRateUsd: 380,
    availability: ['Flexible weekdays'],
    embedding: generateDeterministicVector('David Kross Cloud Infrastructure Kubernetes Serverless'),
    rating: 4.88,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z')
  }
];

class InMemoryExpertStore {
  public profiles = new Map<string, ExpertProfileRecord>();

  constructor() {
    this.seedDemoProfiles();
  }

  public seedDemoProfiles() {
    for (const exp of INITIAL_DEMO_EXPERTS) {
      this.profiles.set(exp.userId, { ...exp });
    }
  }

  clear() {
    this.profiles.clear();
  }
}

export const inMemoryExpertStore = new InMemoryExpertStore();

export const expertRepository = {
  async findByUserId(userId: string): Promise<ExpertProfileRecord | null> {
    if (env.NODE_ENV === 'test') {
      return inMemoryExpertStore.profiles.get(userId) || null;
    }

    try {
      if (mongoose.connection.readyState === 1) {
        const doc = await ExpertProfile.findOne({ userId }).lean();
        if (doc) {
          return {
            id: (doc as any)._id.toString(),
            ...(doc as any)
          } as unknown as ExpertProfileRecord;
        }
      }
      let found = inMemoryExpertStore.profiles.get(userId);
      if (!found) {
        const match = INITIAL_DEMO_EXPERTS.find((e) => e.userId === userId);
        if (match) {
          found = { ...match };
          inMemoryExpertStore.profiles.set(match.userId, found);
        }
      }
      return found || null;
    } catch (err) {
      logger.warn({ err }, 'Mongo expert query failed, using in-memory store');
      let found = inMemoryExpertStore.profiles.get(userId);
      if (!found) {
        const match = INITIAL_DEMO_EXPERTS.find((e) => e.userId === userId);
        if (match) {
          found = { ...match };
          inMemoryExpertStore.profiles.set(match.userId, found);
        }
      }
      return found || null;
    }
  },

  async upsertProfile(
    userId: string,
    data: UpdateExpertProfileInput & { embedding?: number[]; name?: string; email?: string }
  ): Promise<ExpertProfileRecord> {
    const existing = inMemoryExpertStore.profiles.get(userId);
    const updated: ExpertProfileRecord = {
      id: existing ? existing.id : `exp_doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      name: data.name ?? existing?.name ?? 'Expert',
      email: data.email ?? existing?.email ?? '',
      headline: data.headline,
      bio: data.bio,
      industries: data.industries,
      skills: data.skills,
      yearsExperience: data.yearsExperience,
      pastEngagements: data.pastEngagements,
      hourlyRateUsd: data.hourlyRateUsd,
      availability: data.availability,
      embedding: data.embedding ?? existing?.embedding ?? [],
      rating: existing?.rating ?? 5.0,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date()
    };

    inMemoryExpertStore.profiles.set(userId, updated);

    if (env.NODE_ENV !== 'test' && mongoose.connection.readyState === 1) {
      try {
        await ExpertProfile.findOneAndUpdate(
          { userId },
          {
            $set: {
              ...data,
              updatedAt: new Date()
            }
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        logger.warn({ err }, 'Mongo upsert deferred');
      }
    }

    return updated;
  },

  async listExperts(filters: ExpertQueryFilters): Promise<{
    items: ExpertProfileRecord[];
    nextCursor: string | null;
    total: number;
  }> {
    if (inMemoryExpertStore.profiles.size === 0 && env.NODE_ENV !== 'test') {
      inMemoryExpertStore.seedDemoProfiles();
    }
    const limit = filters.limit || 10;
    const all = Array.from(inMemoryExpertStore.profiles.values());

    let filtered = all.filter((exp) => {
      if (filters.industry && !exp.industries.some((i) => i.toLowerCase().includes(filters.industry!.toLowerCase()))) {
        return false;
      }
      if (filters.skill && !exp.skills.some((s) => s.toLowerCase().includes(filters.skill!.toLowerCase()))) {
        return false;
      }
      if (filters.minRating !== undefined && exp.rating < filters.minRating) {
        return false;
      }
      if (filters.maxRate !== undefined && exp.hourlyRateUsd > filters.maxRate) {
        return false;
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesHeadline = exp.headline.toLowerCase().includes(query);
        const matchesBio = exp.bio.toLowerCase().includes(query);
        const matchesSkills = exp.skills.some((s) => s.toLowerCase().includes(query));
        if (!matchesHeadline && !matchesBio && !matchesSkills) return false;
      }
      return true;
    });

    // Cursor pagination (by ID)
    if (filters.cursor) {
      const cursorIndex = filtered.findIndex((item) => item.id === filters.cursor);
      if (cursorIndex >= 0) {
        filtered = filtered.slice(cursorIndex + 1);
      }
    }

    const items = filtered.slice(0, limit);
    const nextCursor = items.length === limit && filtered.length > limit ? items[items.length - 1].id : null;

    return {
      items,
      nextCursor,
      total: filtered.length
    };
  }
};
