import crypto from 'crypto';
import { queryRepository, QueryRecord } from '../queries/query.repository';
import { expertRepository } from '../experts/expert.repository';
import { mlServiceClient } from './ml-client';
import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';
import {
  cacheHitsCounter,
  cacheMissesCounter,
  matchDurationHistogram
} from '../../lib/metrics';
import { NotFoundError } from '../../middleware/error-handler';
import { QueryLog } from '../queries/query-log.model';
import mongoose from 'mongoose';

export interface MatchingResultOutput {
  queryId: string;
  cached: boolean;
  cacheKey: string;
  modelVersion: string;
  timingMs: number;
  matches: Array<{
    expertId: string;
    score: number;
    subScores: {
      semanticSimilarity: number;
      skillsOverlap: number;
      industryMatch: number;
      experienceRatingScore: number;
      bookingLikelihood: number;
    };
    explanation: {
      matchedSkills: string[];
      industryOverlap: boolean;
      semanticSimilarity: number;
      relevantPastEngagements: string[];
      summary: string;
    };
    expert: {
      id: string;
      name: string;
      headline: string;
      hourlyRateUsd: number;
      rating: number;
      industries: string[];
      skills: string[];
    };
  }>;
}

// In-memory cache fallback for tests
const memoryMatchCache = new Map<string, { data: MatchingResultOutput; expiresAt: number }>();

export class MatchingService {
  private computeQueryHash(query: QueryRecord): string {
    const raw = `${query.title}:${query.description}:${query.industry}:${query.budgetUsd}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
  }

  public async getCachedMatch(hash: string): Promise<MatchingResultOutput | null> {
    const cacheKey = `query_match:${hash}`;

    // Try Redis first
    try {
      if (redis.status === 'ready') {
        const cachedStr = await redis.get(cacheKey);
        if (cachedStr) {
          cacheHitsCounter.inc({ cache_key_type: 'match_query' });
          const parsed = JSON.parse(cachedStr) as MatchingResultOutput;
          parsed.cached = true;
          return parsed;
        }
      }
    } catch (_) {}

    // Check memory cache
    const mem = memoryMatchCache.get(cacheKey);
    if (mem && mem.expiresAt > Date.now()) {
      cacheHitsCounter.inc({ cache_key_type: 'match_query' });
      mem.data.cached = true;
      return mem.data;
    }

    cacheMissesCounter.inc({ cache_key_type: 'match_query' });
    return null;
  }

  public async setCachedMatch(hash: string, result: MatchingResultOutput, ttlSeconds = 600): Promise<void> {
    const cacheKey = `query_match:${hash}`;
    // Store in memory
    memoryMatchCache.set(cacheKey, {
      data: { ...result, cached: true },
      expiresAt: Date.now() + ttlSeconds * 1000
    });

    // Store in Redis
    try {
      if (redis.status === 'ready') {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', ttlSeconds);
      }
    } catch (_) {}
  }

  public async executeMatchCalculation(queryId: string): Promise<MatchingResultOutput> {
    const t0 = process.hrtime.bigint();

    const query = await queryRepository.findById(queryId);
    if (!query) {
      throw new NotFoundError(`Query with ID '${queryId}' not found`);
    }

    const queryHash = this.computeQueryHash(query);
    const cached = await this.getCachedMatch(queryHash);
    if (cached) {
      return cached;
    }

    // Fetch candidate experts
    const candidatesResult = await expertRepository.listExperts({ limit: 50 });
    const candidates = candidatesResult.items;

    if (candidates.length === 0) {
      return {
        queryId,
        cached: false,
        cacheKey: `query_match:${queryHash}`,
        modelVersion: 'empty_pool',
        timingMs: 0,
        matches: []
      };
    }

    const tEmbedStart = Date.now();
    // Prepare candidate expert list for ML service ranker
    const candidatesForRanking = candidates.map((c) => ({
      id: c.userId,
      name: c.name || 'Expert Advisor',
      headline: c.headline,
      bio: c.bio,
      industries: c.industries,
      skills: c.skills,
      yearsExperience: c.yearsExperience,
      rating: c.rating,
      hourlyRateUsd: c.hourlyRateUsd,
      pastEngagements: c.pastEngagements,
      embedding: c.embedding
    }));

    const fullQueryText = `${query.title}. ${query.description}`;
    const rankResult = await mlServiceClient.rank({
      queryText: fullQueryText,
      queryIndustry: query.industry,
      queryBudgetUsd: query.budgetUsd,
      candidates: candidatesForRanking,
      topK: 10
    });

    const elapsedEmbedMs = Date.now() - tEmbedStart;
    const elapsedTotalMs = Number(process.hrtime.bigint() - t0) / 1e6;

    // Map ranked experts
    const matchesOutput = rankResult.results.map((r) => {
      const expertProfile = candidates.find((c) => c.userId === r.expertId) || candidates[0];
      return {
        expertId: r.expertId,
        score: r.score,
        subScores: r.subScores,
        explanation: r.explanation,
        expert: {
          id: expertProfile.userId,
          name: expertProfile.name || 'Expert Advisor',
          headline: expertProfile.headline,
          hourlyRateUsd: expertProfile.hourlyRateUsd,
          rating: expertProfile.rating,
          industries: expertProfile.industries,
          skills: expertProfile.skills
        }
      };
    });

    // Save matches in PostgreSQL
    await queryRepository.saveMatches(
      matchesOutput.map((m) => ({
        queryId,
        expertId: m.expertId,
        score: m.score,
        explanation: m.explanation
      }))
    );

    // Update query status to MATCHED
    await queryRepository.updateStatus(queryId, 'MATCHED');

    // Asynchronously log in MongoDB QueryLog if connected
    if (mongoose.connection.readyState === 1) {
      try {
        await QueryLog.create({
          queryId,
          rawText: fullQueryText,
          timingsMs: {
            embed: elapsedEmbedMs,
            rank: rankResult.timingMs,
            total: elapsedTotalMs
          },
          topExpertIds: matchesOutput.map((m) => m.expertId)
        });
      } catch (_) {}
    }

    const resultPayload: MatchingResultOutput = {
      queryId,
      cached: false,
      cacheKey: `query_match:${queryHash}`,
      modelVersion: rankResult.modelVersion,
      timingMs: Number(elapsedTotalMs.toFixed(2)),
      matches: matchesOutput
    };

    // Cache in Redis for 10 minutes (TTL 600s)
    await this.setCachedMatch(queryHash, resultPayload, 600);

    // Record Prometheus metric
    matchDurationHistogram.observe(
      { strategy: 'hybrid_ml', status: 'success' },
      elapsedTotalMs / 1000
    );

    return resultPayload;
  }
}

export const matchingService = new MatchingService();
