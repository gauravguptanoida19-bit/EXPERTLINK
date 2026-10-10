import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { RelevanceRating } from '@prisma/client';

export interface FeedbackRecord {
  id: string;
  bookingId: string | null;
  queryId: string;
  expertId: string;
  clientId: string;
  rating: number | null;
  relevance: RelevanceRating;
  notes: string | null;
  createdAt: Date;
}

class InMemoryFeedbackStore {
  public feedbacks = new Map<string, FeedbackRecord>();

  clear() {
    this.feedbacks.clear();
  }
}

export const inMemoryFeedbackStore = new InMemoryFeedbackStore();

export const feedbackRepository = {
  async createFeedback(data: {
    bookingId?: string | null;
    queryId: string;
    expertId: string;
    clientId: string;
    rating?: number | null;
    relevance?: RelevanceRating;
    notes?: string | null;
  }): Promise<FeedbackRecord> {
    const record: FeedbackRecord = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      bookingId: data.bookingId || null,
      queryId: data.queryId,
      expertId: data.expertId,
      clientId: data.clientId,
      rating: data.rating || null,
      relevance: data.relevance || 'RELEVANT',
      notes: data.notes || null,
      createdAt: new Date()
    };

    inMemoryFeedbackStore.feedbacks.set(record.id, record);

    if (env.NODE_ENV !== 'test') {
      try {
        await prisma.consultationFeedback.create({ data: record });
      } catch (err) {
        logger.warn({ err }, 'Prisma feedback create deferred');
      }
    }

    return record;
  },

  async listFeedbackForExpert(expertId: string): Promise<FeedbackRecord[]> {
    const list = Array.from(inMemoryFeedbackStore.feedbacks.values()).filter(
      (f) => f.expertId === expertId
    );
    return list;
  },

  async getAllFeedbacks(): Promise<FeedbackRecord[]> {
    return Array.from(inMemoryFeedbackStore.feedbacks.values());
  }
};
