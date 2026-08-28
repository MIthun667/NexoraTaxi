import { z } from 'zod';

import { confidenceSchema } from './common.schema';

export const approvalExplanationSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  rationale: z.array(z.string().min(1)).max(10),
  risks: z.array(z.string().min(1)).max(10),
  suggestedDecision: z.enum(['APPROVE', 'REJECT', 'REVIEW']),
  confidence: confidenceSchema,
});

export type ApprovalExplanationOutput = z.infer<typeof approvalExplanationSchema>;
