import { z } from 'zod';

import { confidenceSchema } from './common.schema';

export const driverComplianceExplanationSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  complianceFindings: z.array(z.string().min(1)).max(10),
  blockers: z.array(z.string().min(1)).max(10),
  recommendedActions: z.array(z.string().min(1)).max(10),
  confidence: confidenceSchema,
});

export type DriverComplianceExplanationOutput = z.infer<
  typeof driverComplianceExplanationSchema
>;
