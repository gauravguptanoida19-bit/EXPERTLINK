import { z } from 'zod';

export const structureQuerySchema = z.object({
  rawText: z.string().min(10, 'Please provide at least 10 characters describing your research need')
});

export const expertBriefSchema = z.object({
  queryId: z.string().min(1, 'queryId is required'),
  expertId: z.string().min(1, 'expertId is required')
});

export type StructureQueryInput = z.infer<typeof structureQuerySchema>;
export type ExpertBriefInput = z.infer<typeof expertBriefSchema>;
