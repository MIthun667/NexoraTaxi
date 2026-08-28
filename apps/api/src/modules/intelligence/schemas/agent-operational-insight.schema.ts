import { z } from 'zod';

import { confidenceSchema } from './common.schema';

export const agentOperationalInsightSchema = z.object({
  summary: z.string().min(1),
  findings: z.array(z.string().min(1)).max(8),
  risks: z.array(z.string().min(1)).max(6),
  recommendations: z.array(z.string().min(1)).max(6),
  proposedActions: z
    .array(
      z.object({
        type: z.string().min(1),
        description: z.string().min(1),
        target: z.string().min(1),
        requiresApproval: z.boolean(),
        rationale: z.string().min(1).optional(),
      }),
    )
    .max(5),
  confidence: confidenceSchema,
});

export type AgentOperationalInsightOutput = z.infer<
  typeof agentOperationalInsightSchema
>;
