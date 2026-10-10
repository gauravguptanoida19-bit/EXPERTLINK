import { Router, Request, Response, NextFunction } from 'express';
import { assistantService } from './assistant.service';
import { structureQuerySchema, expertBriefSchema } from './assistant.schemas';
import { authenticate } from '../../middleware/auth';

const router = Router();

// POST /api/assistant/structure-query (turn vague request into structured query + clarifying questions)
router.post('/structure-query', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = structureQuerySchema.parse(req.body);
    const result = await assistantService.structureQuery(validated.rawText);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/assistant/expert-brief (pre-call client briefing)
router.post('/expert-brief', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = expertBriefSchema.parse(req.body);
    const brief = await assistantService.generateExpertBrief(validated.queryId, validated.expertId);
    res.status(200).json({
      success: true,
      data: brief
    });
  } catch (err) {
    next(err);
  }
});

export const assistantRouter = router;
