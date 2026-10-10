import { Router, Request, Response, NextFunction } from 'express';
import { bookingRepository } from './booking.repository';
import {
  createBookingSchema,
  updateBookingStatusSchema,
  publishAvailabilitySchema
} from './booking.schemas';
import { authenticate, authorize } from '../../middleware/auth';
import { NotFoundError } from '../../middleware/error-handler';
import { authRepository } from '../auth/auth.repository';

const router = Router();

// POST /api/bookings (Safe booking engine with Idempotency-Key & double-booking prevention)
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idempotencyKey = (req.header('Idempotency-Key') as string) || undefined;
    if (idempotencyKey) {
      const existing = await bookingRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'Booking returned from idempotency key',
          idempotentReplay: true,
          data: existing
        });
      }
    }

    const validated = createBookingSchema.parse(req.body);
    const clientId = req.user!.userId;

    const booking = await bookingRepository.createBooking({
      queryId: validated.queryId,
      expertId: validated.expertId,
      clientId,
      scheduledAt: new Date(validated.scheduledAt),
      durationMin: validated.durationMin,
      ratePerHourUsd: validated.ratePerHourUsd,
      idempotencyKey
    });

    await authRepository.logAudit({
      userId: clientId,
      action: 'BOOKING_CREATED',
      resource: 'Booking',
      details: { bookingId: booking.id, expertId: booking.expertId }
    });

    res.status(201).json({
      success: true,
      message: 'Consultation booking created successfully',
      data: booking
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings (list user bookings)
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as any;
    const bookings = await bookingRepository.listBookings({
      userId: req.user!.userId,
      role: req.user!.role,
      status
    });

    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id/status (update status)
router.patch('/:id/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = updateBookingStatusSchema.parse(req.body);
    const booking = await bookingRepository.findById(req.params.id);
    if (!booking) {
      throw new NotFoundError(`Booking '${req.params.id}' not found`);
    }

    const updated = await bookingRepository.updateStatus(req.params.id, validated.status);

    await authRepository.logAudit({
      userId: req.user!.userId,
      action: 'BOOKING_STATUS_CHANGE',
      resource: 'Booking',
      details: { bookingId: booking.id, oldStatus: booking.status, newStatus: validated.status }
    });

    res.status(200).json({
      success: true,
      message: `Booking status updated to ${validated.status}`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/availability (Expert publishes slots)
router.post('/availability', authenticate, authorize('EXPERT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = publishAvailabilitySchema.parse(req.body);
    const slots = await bookingRepository.publishAvailabilitySlots(
      req.user!.userId,
      validated.slots.map((s) => ({
        scheduledAt: new Date(s.scheduledAt),
        durationMin: s.durationMin
      }))
    );

    res.status(201).json({
      success: true,
      message: `Published ${slots.length} availability slots`,
      data: slots
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/availability/:expertId (Get open slots)
router.get('/availability/:expertId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slots = await bookingRepository.getAvailableSlots(req.params.expertId);
    res.status(200).json({
      success: true,
      data: slots
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/admin/expire-pending (Automatic 24-hr expiry job trigger)
router.post('/admin/expire-pending', authenticate, authorize('ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await bookingRepository.expireOldPendingBookings(24);
    res.status(200).json({
      success: true,
      message: `Expired ${count} pending bookings`,
      expiredCount: count
    });
  } catch (err) {
    next(err);
  }
});

export const bookingRouter = router;
