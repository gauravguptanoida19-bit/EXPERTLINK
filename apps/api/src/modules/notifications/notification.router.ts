import { Router, Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service';
import { authenticate } from '../../middleware/auth';
import { NotFoundError } from '../../middleware/error-handler';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = notificationService.getUserNotifications(req.user!.userId);
    res.status(200).json({
      success: true,
      data: list
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const success = notificationService.markAsRead(req.params.id, req.user!.userId);
    if (!success) {
      throw new NotFoundError(`Notification '${req.params.id}' not found`);
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (err) {
    next(err);
  }
});

export const notificationRouter = router;
