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

class InMemoryExpertStore {
  public profiles = new Map<string, ExpertProfileRecord>();

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
      return inMemoryExpertStore.profiles.get(userId) || null;
    } catch (err) {
      logger.warn({ err }, 'Mongo expert query failed, using in-memory store');
      return inMemoryExpertStore.profiles.get(userId) || null;
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
