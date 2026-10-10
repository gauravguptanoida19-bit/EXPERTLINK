import { expertRepository, ExpertProfileRecord } from './expert.repository';
import { mlServiceClient } from '../matching/ml-client';
import { ExpertProfile } from './expert.model';
import mongoose from 'mongoose';

// Levenshtein distance for skill typo tolerance
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1].toLowerCase() === s2[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

const KNOWN_SKILLS = [
  'PyTorch', 'TensorFlow', 'Large Language Models', 'Transformers', 'RLHF', 'Computer Vision',
  'CRISPR', 'Genomics', 'Bioinformatics', 'Drug Discovery', 'Clinical Trials',
  'Kubernetes', 'Serverless', 'Terraform', 'eBPF', 'Multi-cloud',
  'EUV Lithography', 'ASIC Design', 'Packaging', 'TSMC Process',
  'Solar Photovoltaics', 'Battery Chemistry', 'Grid Modernization', 'Wind Turbines',
  'Algorithmic Trading', 'Blockchain', 'Payment Rails', 'Risk Modeling',
  'Zero Trust', 'Threat Intelligence', 'Penetration Testing', 'SIEM'
];

export function findTypoCorrections(query: string): { correctedTokens: string[]; correctionsMap: Record<string, string> } {
  const tokens = query.split(/\s+/);
  const correctionsMap: Record<string, string> = {};
  const correctedTokens = tokens.map((token) => {
    const cleanToken = token.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanToken.length < 3) return token;

    for (const skill of KNOWN_SKILLS) {
      const dist = levenshteinDistance(cleanToken, skill);
      if (dist > 0 && dist <= 2) {
        correctionsMap[cleanToken] = skill;
        return skill;
      }
    }
    return token;
  });

  return { correctedTokens, correctionsMap };
}

export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length || v1.length === 0) return 0;
  let dot = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }
  const denom = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denom < 1e-6) return 0;
  return Math.max(0, Math.min(1, (dot / denom + 1) / 2));
}

export interface HybridSearchResult {
  expert: ExpertProfileRecord;
  rrfScore: number;
  keywordRank: number;
  semanticRank: number;
  matchedSkills: string[];
}

export interface FacetCounts {
  industries: Record<string, number>;
  skills: Record<string, number>;
  rateBands: {
    under200: number;
    from200to400: number;
    from400to600: number;
    above600: number;
  };
}

export interface HybridSearchResponse {
  query: string;
  typoSuggestions: Record<string, string>;
  totalResults: number;
  items: HybridSearchResult[];
  facets: FacetCounts;
}

export class HybridSearchService {
  public async search(params: {
    query: string;
    industry?: string;
    minRate?: number;
    maxRate?: number;
    limit?: number;
  }): Promise<HybridSearchResponse> {
    const rawQuery = params.query.trim();
    const { correctionsMap } = findTypoCorrections(rawQuery);
    const effectiveQuery = Object.keys(correctionsMap).length > 0
      ? `${rawQuery} ${Object.values(correctionsMap).join(' ')}`
      : rawQuery;

    // Fetch candidate pool
    const candidatesResult = await expertRepository.listExperts({ limit: 100 });
    let pool = candidatesResult.items;

    // Filters
    if (params.industry) {
      pool = pool.filter((exp) => exp.industries.some((i) => i.toLowerCase().includes(params.industry!.toLowerCase())));
    }
    if (params.minRate !== undefined) {
      pool = pool.filter((exp) => exp.hourlyRateUsd >= params.minRate!);
    }
    if (params.maxRate !== undefined) {
      pool = pool.filter((exp) => exp.hourlyRateUsd <= params.maxRate!);
    }

    if (pool.length === 0) {
      return {
        query: rawQuery,
        typoSuggestions: correctionsMap,
        totalResults: 0,
        items: [],
        facets: {
          industries: {},
          skills: {},
          rateBands: { under200: 0, from200to400: 0, from400to600: 0, above600: 0 }
        }
      };
    }

    // 1. Keyword search ranking
    const qLower = effectiveQuery.toLowerCase();
    const keywordScored = pool.map((exp) => {
      let score = 0;
      const matchedSkills: string[] = [];

      // Check skills with exact & typo tolerance
      for (const skill of exp.skills) {
        if (qLower.includes(skill.toLowerCase())) {
          score += 3.0;
          matchedSkills.push(skill);
        } else {
          // Check typo distance against query words
          const words = qLower.split(/\s+/);
          for (const w of words) {
            if (w.length >= 3 && levenshteinDistance(w, skill.toLowerCase()) <= 2) {
              score += 2.5;
              matchedSkills.push(skill);
              break;
            }
          }
        }
      }

      if (exp.headline.toLowerCase().includes(qLower)) score += 2.0;
      if (exp.bio.toLowerCase().includes(qLower)) score += 1.0;
      for (const ind of exp.industries) {
        if (qLower.includes(ind.toLowerCase())) score += 2.0;
      }

      return { expert: exp, score, matchedSkills };
    });

    keywordScored.sort((a, b) => b.score - a.score);

    // 2. Semantic vector search ranking
    const queryEmb = await mlServiceClient.embed(effectiveQuery);
    const semanticScored = pool.map((exp) => {
      const expEmb = exp.embedding && exp.embedding.length === 384
        ? exp.embedding
        : new Array(384).fill(0.01);
      const sim = cosineSimilarity(queryEmb, expEmb);
      return { expert: exp, sim };
    });

    semanticScored.sort((a, b) => b.sim - a.sim);

    // 3. Reciprocal Rank Fusion (RRF)
    // RRF Score = 1 / (60 + rank_kw) + 1 / (60 + rank_sem)
    const K = 60;
    const rrfScores = new Map<string, {
      expert: ExpertProfileRecord;
      rrfScore: number;
      keywordRank: number;
      semanticRank: number;
      matchedSkills: string[];
    }>();

    keywordScored.forEach((item, idx) => {
      const rank = idx + 1;
      const rrf = 1.0 / (K + rank);
      rrfScores.set(item.expert.userId, {
        expert: item.expert,
        rrfScore: rrf,
        keywordRank: rank,
        semanticRank: pool.length,
        matchedSkills: item.matchedSkills
      });
    });

    semanticScored.forEach((item, idx) => {
      const rank = idx + 1;
      const rrf = 1.0 / (K + rank);
      const existing = rrfScores.get(item.expert.userId);
      if (existing) {
        existing.rrfScore += rrf;
        existing.semanticRank = rank;
      } else {
        rrfScores.set(item.expert.userId, {
          expert: item.expert,
          rrfScore: rrf,
          keywordRank: pool.length,
          semanticRank: rank,
          matchedSkills: []
        });
      }
    });

    const fusedList = Array.from(rrfScores.values());
    fusedList.sort((a, b) => b.rrfScore - a.rrfScore);

    const limit = params.limit || 10;
    const items = fusedList.slice(0, limit);

    // 4. Calculate Facet Counts
    const facetIndustries: Record<string, number> = {};
    const facetSkills: Record<string, number> = {};
    const rateBands = {
      under200: 0,
      from200to400: 0,
      from400to600: 0,
      above600: 0
    };

    pool.forEach((exp) => {
      // Industry facets
      exp.industries.forEach((ind) => {
        facetIndustries[ind] = (facetIndustries[ind] || 0) + 1;
      });

      // Skill facets
      exp.skills.forEach((skill) => {
        facetSkills[skill] = (facetSkills[skill] || 0) + 1;
      });

      // Rate band facets
      const rate = exp.hourlyRateUsd;
      if (rate < 200) rateBands.under200++;
      else if (rate <= 400) rateBands.from200to400++;
      else if (rate <= 600) rateBands.from400to600++;
      else rateBands.above600++;
    });

    return {
      query: rawQuery,
      typoSuggestions: correctionsMap,
      totalResults: fusedList.length,
      items,
      facets: {
        industries: facetIndustries,
        skills: facetSkills,
        rateBands
      }
    };
  }
}

export const hybridSearchService = new HybridSearchService();
