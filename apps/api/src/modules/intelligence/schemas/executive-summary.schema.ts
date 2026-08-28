import { z } from 'zod';

export const executiveSummarySchema = z.object({
  summary: z.string().min(1).max(1200),
  highlights: z.array(z.string().min(1).max(240)).max(4),
  risks: z.array(z.string().min(1).max(240)).max(4),
  leadershipFocus: z.array(z.string().min(1).max(240)).max(4),
});

export type ExecutiveSummaryOutput = z.infer<typeof executiveSummarySchema>;
