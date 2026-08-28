import { BadGatewayException, Injectable } from '@nestjs/common';
import { AgentRiskLevel } from '@prisma/client';
import { z } from 'zod';

import { AgentReasoningOutput } from './reasoning.types';

const recommendationSchema = z.object({
  action_type: z.string().min(1),
  summary: z.string().min(1),
  target_entity_type: z.string().nullable().optional(),
  target_entity_id: z.string().nullable().optional(),
  rationale: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
});

const reasoningOutputSchema = z.object({
  summary: z.string().min(1),
  risk_level: z.nativeEnum(AgentRiskLevel),
  findings: z.array(z.string()).default([]),
  recommended_actions: z.array(recommendationSchema).default([]),
  confidence: z.number().min(0).max(1),
});

@Injectable()
export class ResponseParserService {
  parse(content: string): AgentReasoningOutput {
    const normalized = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(normalized);
    } catch {
      throw new BadGatewayException('The reasoning engine returned invalid JSON.');
    }

    const validated = reasoningOutputSchema.safeParse(parsed);
    if (!validated.success) {
      throw new BadGatewayException('The reasoning engine returned an invalid structured response.');
    }

    return validated.data;
  }
}
