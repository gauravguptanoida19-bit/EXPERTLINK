import { z } from 'zod';

export const createQuerySchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  industry: z.string().min(2, 'Industry is required'),
  budgetUsd: z.number().min(50, 'Budget must be at least $50')
});

export const queryFilterSchema = z.object({
  status: z.enum(['OPEN', 'MATCHED', 'CLOSED']).optional(),
  industry: z.string().optional(),
  limit: z.string().optional().transform((v) => (v ? Math.min(parseInt(v, 10), 50) : 20)),
  cursor: z.string().optional()
});

export type CreateQueryInput = z.infer<typeof createQuerySchema>;
export type QueryFilterInput = z.infer<typeof queryFilterSchema>;
