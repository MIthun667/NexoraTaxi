import { z } from 'zod';

import { confidenceSchema } from './common.schema';

export const dispatchIncidentSummarySchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  severityAssessment: z.string().min(1),
  immediateActions: z.array(z.string().min(1)).max(10),
  escalationRecommendation: z.string().min(1),
  confidence: confidenceSchema,
});

export type DispatchIncidentSummaryOutput = z.infer<typeof dispatchIncidentSummarySchema>;
