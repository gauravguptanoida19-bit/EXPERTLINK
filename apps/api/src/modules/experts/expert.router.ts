import { Router, Request, Response, NextFunction } from 'express';
import { expertService } from './expert.service';
import { expertQueryFiltersSchema, updateExpertProfileSchema } from './expert.schemas';
import { hybridSearchService } from './hybrid-search.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// GET /api/experts/search/hybrid (Keyword + Semantic Vector Search with RRF & Facets)
router.get('/search/hybrid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req.query.q as string) || '';
    const industry = req.query.industry as string | undefined;
    const minRate = req.query.minRate ? parseFloat(req.query.minRate as string) : undefined;
    const maxRate = req.query.maxRate ? parseFloat(req.query.maxRate as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await hybridSearchService.search({
      query,
      industry,
      minRate,
      maxRate,
      limit
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/experts (filters + pagination)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = expertQueryFiltersSchema.parse(req.query);
    const result = await expertService.listExperts(filters);
    res.status(200).json({
      success: true,
      data: result.items,
      pagination: {
        nextCursor: result.nextCursor,
        total: result.total,
        limit: filters.limit
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/experts/me (EXPERT fetches own profile)
router.get('/me', authenticate, authorize('EXPERT', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const profile = await expertService.getProfileByUserId(userId);
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/experts/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await expertService.getProfileByUserId(req.params.id);
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/experts/me (EXPERT only; re-generates embedding)
router.put('/me', authenticate, authorize('EXPERT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = updateExpertProfileSchema.parse(req.body);
    const userId = req.user!.userId;
    const updated = await expertService.updateProfile(userId, validated, {
      name: validated.name,
      email: req.user!.email
    });

    res.status(200).json({
      success: true,
      message: 'Expert profile updated and embedding re-generated successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

export const expertRouter = router;
