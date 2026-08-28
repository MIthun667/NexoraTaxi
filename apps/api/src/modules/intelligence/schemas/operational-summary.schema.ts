import { z } from 'zod';

import { confidenceSchema } from './common.schema';

export const operationalSummarySchema = z.object({
  headline: z.string().min(1),
  summary: z.string().min(1),
  topRisks: z.array(z.string().min(1)).max(10),
  recommendedActions: z.array(z.string().min(1)).max(10),
  confidence: confidenceSchema,
});

export type OperationalSummaryOutput = z.infer<typeof operationalSummarySchema>;
