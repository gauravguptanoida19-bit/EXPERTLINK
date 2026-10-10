import { z } from 'zod';

export const suggestionFeedbackSchema = z.object({
  queryId: z.string().min(1, 'queryId is required'),
  expertId: z.string().min(1, 'expertId is required'),
  relevance: z.enum(['RELEVANT', 'NOT_RELEVANT']),
  notes: z.string().optional()
});

export const consultationFeedbackSchema = z.object({
  bookingId: z.string().min(1, 'bookingId is required'),
  rating: z.number().int().min(1).max(5),
  notes: z.string().optional()
});

export type SuggestionFeedbackInput = z.infer<typeof suggestionFeedbackSchema>;
export type ConsultationFeedbackInput = z.infer<typeof consultationFeedbackSchema>;
