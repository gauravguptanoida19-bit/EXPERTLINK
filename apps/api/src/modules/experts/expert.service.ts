import { expertRepository, ExpertProfileRecord } from './expert.repository';
import { UpdateExpertProfileInput, ExpertQueryFilters } from './expert.schemas';
import { NotFoundError } from '../../middleware/error-handler';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

export class ExpertService {
  /**
   * Deterministic 384-dim embedding generator fallback used when ML service is starting up or in offline tests
   */
  public generateFallbackEmbedding(text: string, dim = 384): number[] {
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

  /**
   * Fetch embedding from ML service (FastAPI POST /embed) or fallback
   */
  public async getEmbedding(text: string): Promise<number[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${env.ML_SERVICE_URL}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as any;
        if (Array.isArray(data.embedding) && data.embedding.length === 384) {
          return data.embedding;
        }
      }
    } catch (err: any) {
      logger.debug({ err: err.message }, 'ML service embedding request failed, using deterministic embedding');
    }

    return this.generateFallbackEmbedding(text);
  }

  public async getProfileByUserId(userId: string): Promise<ExpertProfileRecord> {
    const profile = await expertRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError(`Expert profile for user '${userId}' not found`);
    }
    return profile;
  }

  public async updateProfile(userId: string, input: UpdateExpertProfileInput, extra?: { name?: string; email?: string }): Promise<ExpertProfileRecord> {
    // Generate fresh embedding from headline + bio + skills
    const textForEmbedding = `${input.headline} ${input.bio} ${input.skills.join(' ')}`;
    const embedding = await this.getEmbedding(textForEmbedding);

    const updated = await expertRepository.upsertProfile(userId, {
      ...input,
      embedding,
      name: extra?.name,
      email: extra?.email
    });

    return updated;
  }

  public async listExperts(filters: ExpertQueryFilters) {
    return await expertRepository.listExperts(filters);
  }
}

export const expertService = new ExpertService();
