import { z } from 'zod';

export const confidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export type ConfidenceLevel = z.infer<typeof confidenceSchema>;
