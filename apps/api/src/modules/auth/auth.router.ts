import { Router, Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.schemas';
import { authenticate, authorize } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';

const router = Router();

// Rate limit auth endpoints: 20 req / 60 sec
const authLimiter = rateLimit({ windowSec: 60, maxRequests: 20, prefix: 'auth' });

router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = registerSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const result = await authService.register(validated, ip);
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = loginSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const result = await authService.login(validated, ip);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = refreshTokenSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const tokens = await authService.refreshToken(validated.refreshToken, ip);
    res.status(200).json({
      success: true,
      data: tokens
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = refreshTokenSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    await authService.logout(validated.refreshToken, req.user?.userId, ip);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getCurrentUser(req.user!.userId);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
});

// Admin-only test endpoint to verify RBAC
router.get('/admin-only', authenticate, authorize('ADMIN'), (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome Admin',
    user: req.user
  });
});

export const authRouter = router;
