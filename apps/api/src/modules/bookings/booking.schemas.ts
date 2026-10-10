import { z } from 'zod';

export const createBookingSchema = z.object({
  queryId: z.string().min(1, 'queryId is required'),
  expertId: z.string().min(1, 'expertId is required'),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'scheduledAt must be a valid ISO 8601 datetime string'
  }),
  durationMin: z.number().int().min(15).max(180).default(60),
  ratePerHourUsd: z.number().min(10, 'Rate must be at least $10')
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'COMPLETED', 'CANCELLED'])
});

export const publishAvailabilitySchema = z.object({
  slots: z
    .array(
      z.object({
        scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: 'scheduledAt must be a valid ISO 8601 datetime string'
        }),
        durationMin: z.number().int().min(15).max(180).default(60)
      })
    )
    .min(1, 'At least one slot is required')
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type PublishAvailabilityInput = z.infer<typeof publishAvailabilitySchema>;
