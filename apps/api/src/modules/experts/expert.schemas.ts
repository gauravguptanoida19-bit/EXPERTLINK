import { z } from 'zod';

export const pastEngagementSchema = z.object({
  topic: z.string().min(2, 'Topic must be at least 2 characters'),
  company: z.string().min(2, 'Company name is required'),
  year: z.number().int().min(1970).max(new Date().getFullYear())
});

export const updateExpertProfileSchema = z.object({
  name: z.string().optional(),
  headline: z.string().min(3, 'Headline must be at least 3 characters'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  industries: z.array(z.string()).min(1, 'At least one industry is required'),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  yearsExperience: z.number().min(0, 'Years of experience must be non-negative'),
  pastEngagements: z.array(pastEngagementSchema).default([]),
  hourlyRateUsd: z.number().min(10, 'Hourly rate must be at least $10'),
  availability: z.array(z.string()).default([])
});

export const expertQueryFiltersSchema = z.object({
  industry: z.string().optional(),
  skill: z.string().optional(),
  minRating: z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
  maxRate: z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.string().optional().transform((v) => (v ? Math.min(parseInt(v, 10), 50) : 10))
});

export type UpdateExpertProfileInput = z.infer<typeof updateExpertProfileSchema>;
export type ExpertQueryFilters = z.infer<typeof expertQueryFiltersSchema>;
