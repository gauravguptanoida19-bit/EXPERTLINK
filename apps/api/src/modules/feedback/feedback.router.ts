import { Router, Request, Response, NextFunction } from 'express';
import { feedbackService } from './feedback.service';
import { suggestionFeedbackSchema, consultationFeedbackSchema } from './feedback.schemas';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// POST /api/feedback/suggestion (Client rates suggested expert)
router.post('/suggestion', authenticate, authorize('CLIENT', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = suggestionFeedbackSchema.parse(req.body);
    const feedback = await feedbackService.submitSuggestionFeedback(req.user!.userId, validated);
    res.status(201).json({
      success: true,
      message: 'Suggestion feedback recorded',
      data: feedback
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feedback/consultation (Client rates completed consultation)
router.post('/consultation', authenticate, authorize('CLIENT', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = consultationFeedbackSchema.parse(req.body);
    const feedback = await feedbackService.submitConsultationFeedback(req.user!.userId, validated);
    res.status(201).json({
      success: true,
      message: 'Consultation review recorded',
      data: feedback
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/feedback/expert/:expertId
router.get('/expert/:expertId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await feedbackService.getExpertFeedback(req.params.expertId);
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feedback/admin/retrain-now (ADMIN trigger for nightly retraining pipeline)
router.post('/admin/retrain-now', authenticate, authorize('ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await feedbackService.executeNightlyRetraining();
    res.status(200).json({
      success: true,
      message: 'Nightly ranker retraining completed successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
});

export const feedbackRouter = router;
