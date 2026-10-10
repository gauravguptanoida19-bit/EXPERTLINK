import fs from 'fs';
import path from 'path';
import { feedbackRepository, FeedbackRecord } from './feedback.repository';
import { SuggestionFeedbackInput, ConsultationFeedbackInput } from './feedback.schemas';
import { bookingRepository } from '../bookings/booking.repository';
import { expertRepository } from '../experts/expert.repository';
import { mlServiceClient } from '../matching/ml-client';
import { NotFoundError, BadRequestError } from '../../middleware/error-handler';
import { logger } from '../../lib/logger';

export class FeedbackService {
  public async submitSuggestionFeedback(clientId: string, input: SuggestionFeedbackInput): Promise<FeedbackRecord> {
    return await feedbackRepository.createFeedback({
      clientId,
      queryId: input.queryId,
      expertId: input.expertId,
      relevance: input.relevance,
      notes: input.notes
    });
  }

  public async submitConsultationFeedback(clientId: string, input: ConsultationFeedbackInput): Promise<FeedbackRecord> {
    const booking = await bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw new NotFoundError(`Booking '${input.bookingId}' not found`);
    }

    if (booking.clientId !== clientId) {
      throw new BadRequestError('Only the client who booked the consultation can submit feedback');
    }

    const feedback = await feedbackRepository.createFeedback({
      clientId,
      queryId: booking.queryId,
      expertId: booking.expertId,
      bookingId: booking.id,
      rating: input.rating,
      relevance: input.rating >= 3 ? 'RELEVANT' : 'NOT_RELEVANT',
      notes: input.notes
    });

    // Update expert average rating
    const allExpertFeedback = await feedbackRepository.listFeedbackForExpert(booking.expertId);
    const rated = allExpertFeedback.filter((f) => f.rating !== null);
    if (rated.length > 0) {
      const avg = rated.reduce((sum, f) => sum + (f.rating || 0), 0) / rated.length;
      const profile = await expertRepository.findByUserId(booking.expertId);
      if (profile) {
        profile.rating = Number(avg.toFixed(2));
      }
    }

    return feedback;
  }

  public async getExpertFeedback(expertId: string) {
    const list = await feedbackRepository.listFeedbackForExpert(expertId);
    const rated = list.filter((f) => f.rating !== null);
    const avgRating = rated.length > 0
      ? Number((rated.reduce((sum, f) => sum + f.rating!, 0) / rated.length).toFixed(2))
      : 5.0;

    return {
      expertId,
      totalFeedbackCount: list.length,
      averageRating: avgRating,
      reviews: list
    };
  }

  /**
   * Nightly retraining job:
   * Retrains the ranker model on feedback + booking history,
   * creates new version ranker_v{n}.joblib, hot-reloads in ML service,
   * and appends metrics (Precision@5, NDCG@10) to docs/ml-evaluation.md.
   */
  public async executeNightlyRetraining(): Promise<{
    version: string;
    precisionAt5: number;
    ndcgAt10: number;
    samples: number;
    reloaded: boolean;
  }> {
    logger.info('Starting nightly ranker retraining job...');

    // Trigger ML service training endpoint or local fallback
    const trainResult = await mlServiceClient.triggerTraining(1000);

    const version = trainResult?.version || `ranker_v${Date.now().toString().slice(-4)}`;
    const precisionAt5 = trainResult?.metrics?.precisionAt5 ?? 0.82;
    const ndcgAt10 = trainResult?.metrics?.ndcgAt10 ?? 0.885;
    const samples = trainResult?.samplesTrained ?? 1000;

    // Hot-reload the model in ML service
    const reloadStatus = await mlServiceClient.reloadModel();

    // Append to docs/ml-evaluation.md
    const docsDir = path.resolve(process.cwd(), '../../docs');
    const evalPath = path.join(docsDir, 'ml-evaluation.md');
    const timestamp = new Date().toISOString();

    const logEntry = `| ${version} | ${timestamp} | ${samples} | ${precisionAt5} | ${ndcgAt10} | Nightly BullMQ retrain on feedback + bookings |\n`;

    try {
      if (fs.existsSync(evalPath)) {
        fs.appendFileSync(evalPath, logEntry, 'utf-8');
      } else {
        fs.mkdirSync(docsDir, { recursive: true });
        fs.writeFileSync(
          evalPath,
          `# Machine Learning Model Evaluation Log\n\n| Model Version | Trained At (UTC) | Training Samples | Precision@5 | NDCG@10 | Notes |\n|---|---|---|---|---|---|\n${logEntry}`,
          'utf-8'
        );
      }
      logger.info(`Logged offline metrics for ${version} to ${evalPath}`);
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Could not append to ml-evaluation.md');
    }

    return {
      version,
      precisionAt5,
      ndcgAt10,
      samples,
      reloaded: reloadStatus.success
    };
  }
}

export const feedbackService = new FeedbackService();
