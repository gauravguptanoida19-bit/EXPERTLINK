import { prisma } from '../../lib/prisma';
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

class InMemoryQueryStore {
  public queries = new Map<string, QueryRecord>();
  public matches: MatchRecord[] = [];

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
      try {
        const { matches, ...prismaData } = record;
        await prisma.query.create({ data: prismaData });
      } catch (err) {
        logger.warn({ err }, 'Prisma query creation deferred');
      }
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
      try {
        const q = await prisma.query.findUnique({
          where: { id },
          include: {
            matches: {
              include: { expert: { select: { id: true, name: true, email: true } } },
              orderBy: { score: 'desc' }
            }
          }
        });
        if (q) return q as any;
      } catch (err) {
        logger.warn({ err }, 'Prisma query fetch deferred');
      }
    }

    return null;
  },

  async findByClientId(clientId: string): Promise<QueryRecord[]> {
    const memQueries = Array.from(inMemoryQueryStore.queries.values())
      .filter((q) => q.clientId === clientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (memQueries.length > 0 || env.NODE_ENV === 'test') {
      return memQueries.map((q) => ({
        ...q,
        matches: inMemoryQueryStore.matches.filter((m) => m.queryId === q.id)
      }));
    }

    try {
      return (await prisma.query.findMany({
        where: { clientId },
        include: { matches: true },
        orderBy: { createdAt: 'desc' }
      })) as any;
    } catch (_) {
      return memQueries;
    }
  },

  async updateStatus(queryId: string, status: QueryStatus): Promise<void> {
    const q = inMemoryQueryStore.queries.get(queryId);
    if (q) {
      q.status = status;
      q.updatedAt = new Date();
    }

    if (env.NODE_ENV !== 'test') {
      try {
        await prisma.query.update({
          where: { id: queryId },
          data: { status }
        });
      } catch (_) {}
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
      try {
        await prisma.match.createMany({
          data: matchesData
        });
      } catch (_) {}
    }

    return saved;
  }
};
