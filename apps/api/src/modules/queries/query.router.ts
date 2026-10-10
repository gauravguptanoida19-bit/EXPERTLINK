import { Router, Request, Response, NextFunction } from 'express';
import { queryRepository } from './query.repository';
import { createQuerySchema } from './query.schemas';
import { matchingService } from '../matching/matching.service';
import { enqueueMatchingJob, getJobStatus, getQueueHealth } from '../../jobs';
import { authenticate, authorize } from '../../middleware/auth';
import { NotFoundError } from '../../middleware/error-handler';

const router = Router();

// POST /api/queries (CLIENT creates research query)
router.post('/', authenticate, authorize('CLIENT', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createQuerySchema.parse(req.body);
    const clientId = req.user!.userId;

    const query = await queryRepository.createQuery({
      clientId,
      title: validated.title,
      description: validated.description,
      industry: validated.industry,
      budgetUsd: validated.budgetUsd
    });

    res.status(201).json({
      success: true,
      message: 'Query posted successfully',
      data: query
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/queries (own queries for client, all for admin)
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.user!.userId;
    const queries = await queryRepository.findByClientId(clientId);

    res.status(200).json({
      success: true,
      data: queries
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/queries/:id
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = await queryRepository.findById(req.params.id);
    if (!query) {
      throw new NotFoundError(`Query with ID '${req.params.id}' not found`);
    }

    res.status(200).json({
      success: true,
      data: query
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/queries/:id/match (returns 202 with job ID, or synchronous if ?sync=true)
router.post('/:id/match', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryId = req.params.id;
    const query = await queryRepository.findById(queryId);
    if (!query) {
      throw new NotFoundError(`Query with ID '${queryId}' not found`);
    }

    // Allow sync execution when requested via query param (e.g. ?sync=true or in benchmark)
    if (req.query.sync === 'true') {
      const matchResult = await matchingService.executeMatchCalculation(queryId);
      return res.status(200).json({
        success: true,
        data: matchResult
      });
    }

    // Async job pipeline (BullMQ) -> returns 202 Accepted
    const jobId = await enqueueMatchingJob({
      queryId: query.id,
      clientId: query.clientId,
      queryText: `${query.title} ${query.description}`,
      industry: query.industry,
      budgetUsd: query.budgetUsd
    });

    res.status(202).json({
      success: true,
      statusCode: 202,
      message: 'Expert matching job accepted and queued for execution',
      jobId,
      statusUrl: `/api/jobs/${jobId}`
    });
  } catch (err) {
    next(err);
  }
});

export const queryRouter = router;

// Jobs Router
const jobsRouter = Router();

// GET /api/jobs/:id (Job status and progress)
jobsRouter.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await getJobStatus(req.params.id);
    if (!job) {
      throw new NotFoundError(`Job with ID '${req.params.id}' not found`);
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/admin/queue-health (Admin view of queue health)
jobsRouter.get('/admin/queue-health', authenticate, authorize('ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await getQueueHealth();
    res.status(200).json({
      success: true,
      data: health
    });
  } catch (err) {
    next(err);
  }
});

export { jobsRouter };
