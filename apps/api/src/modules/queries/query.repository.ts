import { prisma, tryPrisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { QueryStatus } from '@prisma/client';

export interface QueryRecord {
  id: string;
  clientId: string;
  title: string;
  description: string;
  industry: string;
  budgetUsd: number;
  status: QueryStatus;
  createdAt: Date;
  updatedAt: Date;
  matches?: MatchRecord[];
}

export interface MatchRecord {
  id: string;
  queryId: string;
  expertId: string;
  score: number;
  explanation: any;
  createdAt: Date;
  expert?: {
    id: string;
    name: string;
    email: string;
  };
}

export const INITIAL_DEMO_QUERIES: QueryRecord[] = [
  {
    id: 'query_demo_001',
    clientId: 'demo-client-id-001',
    title: 'Enterprise LLM Fine-tuning & Production Alignment Architecture',
    description: 'We are evaluating options for deploying custom 70B parameter open-weights models in private VPCs with strict PII filtering and low-latency inference.',
    industry: 'Artificial Intelligence',
    budgetUsd: 5000,
    status: 'MATCHED',
    createdAt: new Date('2026-01-02T10:00:00Z'),
    updatedAt: new Date('2026-01-02T10:00:00Z')
  },
  {
    id: 'query_demo_002',
    clientId: 'demo-client-id-001',
    title: 'Next-Generation Battery Management Systems for Commercial EVs',
    description: 'Seeking consultation on solid-state battery thermal management, fast charging cycle degradation, and BMS telemetry integration.',
    industry: 'Electric Vehicles',
    budgetUsd: 3500,
    status: 'OPEN',
    createdAt: new Date('2026-01-03T14:30:00Z'),
    updatedAt: new Date('2026-01-03T14:30:00Z')
  }
];

class InMemoryQueryStore {
  public queries = new Map<string, QueryRecord>();
  public matches: MatchRecord[] = [];

  constructor() {
    this.seedDemoQueries();
  }

  public seedDemoQueries() {
    for (const q of INITIAL_DEMO_QUERIES) {
      this.queries.set(q.id, { ...q });
    }
  }

  clear() {
    this.queries.clear();
    this.matches = [];
  }
}

export const inMemoryQueryStore = new InMemoryQueryStore();

export const queryRepository = {
  async createQuery(data: {
    id?: string;
    clientId: string;
    title: string;
    description: string;
    industry: string;
    budgetUsd: number;
  }): Promise<QueryRecord> {
    const record: QueryRecord = {
      id: data.id || `query_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      clientId: data.clientId,
      title: data.title,
      description: data.description,
      industry: data.industry,
      budgetUsd: data.budgetUsd,
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    inMemoryQueryStore.queries.set(record.id, record);

    if (env.NODE_ENV !== 'test') {
      const { matches, ...prismaData } = record;
      await tryPrisma(
        async () => {
          await prisma.query.create({ data: prismaData });
        },
        () => {}
      );
    }

    return record;
  },

  async findById(id: string): Promise<QueryRecord | null> {
    const memQuery = inMemoryQueryStore.queries.get(id);
    if (memQuery) {
      const matches = inMemoryQueryStore.matches.filter((m) => m.queryId === id);
      return { ...memQuery, matches };
    }

    if (env.NODE_ENV !== 'test') {
      return tryPrisma(
        async () => {
          const q = await prisma.query.findUnique({
            where: { id },
            include: {
              matches: {
                include: { expert: { select: { id: true, name: true, email: true } } },
                orderBy: { score: 'desc' }
              }
            }
          });
          return (q as any) || null;
        },
        () => null
      );
    }

    return null;
  },

  async findByClientId(clientId: string): Promise<QueryRecord[]> {
    if (inMemoryQueryStore.queries.size === 0 && env.NODE_ENV !== 'test') {
      inMemoryQueryStore.seedDemoQueries();
    }

    const memQueries = Array.from(inMemoryQueryStore.queries.values())
      .filter((q) => q.clientId === clientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (env.NODE_ENV === 'test' || memQueries.length > 0) {
      return memQueries.map((q) => ({
        ...q,
        matches: inMemoryQueryStore.matches.filter((m) => m.queryId === q.id)
      }));
    }

    return tryPrisma(
      async () => {
        return (await prisma.query.findMany({
          where: { clientId },
          include: { matches: true },
          orderBy: { createdAt: 'desc' }
        })) as any;
      },
      () => memQueries
    );
  },

  async updateStatus(queryId: string, status: QueryStatus): Promise<void> {
    const q = inMemoryQueryStore.queries.get(queryId);
    if (q) {
      q.status = status;
      q.updatedAt = new Date();
    }

    if (env.NODE_ENV !== 'test') {
      await tryPrisma(
        async () => {
          await prisma.query.update({
            where: { id: queryId },
            data: { status }
          });
        },
        () => {}
      );
    }
  },

  async saveMatches(matchesData: Array<{
    queryId: string;
    expertId: string;
    score: number;
    explanation: any;
  }>): Promise<MatchRecord[]> {
    const saved: MatchRecord[] = [];

    for (const m of matchesData) {
      const rec: MatchRecord = {
        id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        queryId: m.queryId,
        expertId: m.expertId,
        score: m.score,
        explanation: m.explanation,
        createdAt: new Date()
      };
      inMemoryQueryStore.matches.push(rec);
      saved.push(rec);
    }

    if (env.NODE_ENV !== 'test') {
      await tryPrisma(
        async () => {
          await prisma.match.createMany({
            data: matchesData
          });
        },
        () => {}
      );
    }

    return saved;
  }
};

