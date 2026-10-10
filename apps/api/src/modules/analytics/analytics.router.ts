import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// GET /api/analytics/overview (ADMIN only)
router.get('/overview', authenticate, authorize('ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const overview = await analyticsService.getOverview();
    res.status(200).json({
      success: true,
      data: overview
    });
  } catch (err) {
    next(err);
  }
});

export const analyticsRouter = router;
