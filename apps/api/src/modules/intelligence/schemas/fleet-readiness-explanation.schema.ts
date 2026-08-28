import { z } from 'zod';

import { confidenceSchema } from './common.schema';

export const fleetReadinessExplanationSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  readinessFindings: z.array(z.string().min(1)).max(10),
  blockers: z.array(z.string().min(1)).max(10),
  recommendedActions: z.array(z.string().min(1)).max(10),
  confidence: confidenceSchema,
});

export type FleetReadinessExplanationOutput = z.infer<typeof fleetReadinessExplanationSchema>;
