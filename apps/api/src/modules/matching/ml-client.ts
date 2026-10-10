import { env } from '../../config/env';
import { logger } from '../../lib/logger';

export interface CandidateForRanking {
  id: string;
  name: string;
  headline: string;
  bio: string;
  industries: string[];
  skills: string[];
  yearsExperience: number;
  rating: number;
  hourlyRateUsd: number;
  pastEngagements: Array<{ topic: string; company: string; year: number }>;
  embedding?: number[];
}

export interface RankedResult {
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
}

export interface RankResponsePayload {
  results: RankedResult[];
  modelVersion: string;
  timingMs: number;
}

export class MlServiceClient {
  private baseUrl = env.ML_SERVICE_URL;

  public async embed(text: string): Promise<number[]> {
    if (env.NODE_ENV === 'test') {
      return this.fallbackEmbedding(text);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as any;
        if (Array.isArray(data.embedding)) {
          return data.embedding;
        }
      }
    } catch (err: any) {
      logger.debug({ err: err.message }, 'ML embed call failed, falling back to local vector generation');
    }

    // Local deterministic embedding fallback
    return this.fallbackEmbedding(text);
  }

  public async rank(params: {
    queryText: string;
    queryIndustry?: string;
    queryBudgetUsd?: number;
    candidates: CandidateForRanking[];
    topK?: number;
  }): Promise<RankResponsePayload> {
    const t0 = Date.now();

    if (env.NODE_ENV === 'test') {
      return this.fallbackRank(params, Date.now() - t0);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${this.baseUrl}/rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryText: params.queryText,
          queryIndustry: params.queryIndustry,
          queryBudgetUsd: params.queryBudgetUsd,
          candidates: params.candidates,
          topK: params.topK || 10
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as RankResponsePayload;
        return data;
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'ML rank call failed, executing local heuristic ranking fallback');
    }

    return this.fallbackRank(params, Date.now() - t0);
  }

  public async reloadModel(): Promise<{ success: boolean; version?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/reload-model`, { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as any;
        return { success: true, version: data.currentVersion };
      }
    } catch (_) {}
    return { success: false };
  }

  public async triggerTraining(numSamples = 1000): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numSamples, saveModel: true })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
    return null;
  }

  private fallbackEmbedding(text: string, dim = 384): number[] {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
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

  private fallbackRank(params: {
    queryText: string;
    queryIndustry?: string;
    queryBudgetUsd?: number;
    candidates: CandidateForRanking[];
    topK?: number;
  }, elapsedMs: number): RankResponsePayload {
    const qLower = params.queryText.toLowerCase();
    const scored = params.candidates.map((c) => {
      const matchedSkills = c.skills.filter((skill) => {
        const sLower = skill.toLowerCase();
        if (qLower.includes(sLower)) return true;
        const words = sLower.split(/\s+/).filter((w) => w.length > 2);
        return words.length > 0 && words.every((w) => qLower.includes(w));
      });
      const skillsScore = c.skills.length > 0 ? matchedSkills.length / c.skills.length : 0.0;
      const industryMatch = params.queryIndustry
        ? c.industries.some((i) => i.toLowerCase().includes(params.queryIndustry!.toLowerCase()))
        : false;
      const indScore = industryMatch ? 1.0 : 0.2;
      const expScore = Math.min(1.0, c.yearsExperience / 20.0);
      const ratingScore = c.rating / 5.0;
      const semanticScore = 0.70 + (matchedSkills.length > 0 ? 0.20 : 0.0);

      const totalScore =
        0.40 * semanticScore +
        0.25 * skillsScore +
        0.15 * indScore +
        0.10 * (0.5 * expScore + 0.5 * ratingScore) +
        0.10 * 0.75;

      return {
        expertId: c.id,
        score: Number(totalScore.toFixed(4)),
        subScores: {
          semanticSimilarity: Number(semanticScore.toFixed(4)),
          skillsOverlap: Number(skillsScore.toFixed(4)),
          industryMatch: Number(indScore.toFixed(4)),
          experienceRatingScore: Number(((expScore + ratingScore) / 2).toFixed(4)),
          bookingLikelihood: 0.75
        },
        explanation: {
          matchedSkills,
          industryOverlap: industryMatch,
          semanticSimilarity: Number(semanticScore.toFixed(4)),
          relevantPastEngagements: c.pastEngagements.map((p) => `${p.topic} (${p.company})`),
          summary: `Matched ${matchedSkills.length} skills with strong domain fit.`
        }
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, params.topK || 10);

    return {
      results: topResults,
      modelVersion: 'heuristic_local_fallback_v0',
      timingMs: elapsedMs
    };
  }
}

export const mlServiceClient = new MlServiceClient();
