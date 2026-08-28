import { Injectable } from '@nestjs/common';

import { AgentPrompt, ReasoningContext } from './reasoning.types';

@Injectable()
export class PromptBuilderService {
  buildPrompt(context: ReasoningContext): AgentPrompt {
    const systemPrompt = [
      'You are an operations reasoning engine for an AI Company Operating System.',
      'You must reason only from the provided retrieval bundle and input context.',
      'Do not invent missing facts. If data is missing, say so in findings.',
      'Return valid JSON only.',
      'Use this exact schema:',
      '{"summary":string,"risk_level":"LOW|MEDIUM|HIGH|CRITICAL","findings":string[],"recommended_actions":[{"action_type":string,"summary":string,"target_entity_type":string|null,"target_entity_id":string|null,"rationale":string|null,"payload":object|null}],"confidence":number}',
      'Confidence must be a number between 0 and 1.',
      'Recommended actions must be concrete, minimal, and operationally safe.',
    ].join('\n');

    const userPrompt = [
      `Agent: ${context.agentDefinition.name} (${context.agentDefinition.code})`,
      `Organization: ${context.organizationId}`,
      `Target entity type: ${context.entityType ?? 'none'}`,
      `Target entity id: ${context.entityId ?? 'none'}`,
      'Input context:',
      JSON.stringify(context.inputContext ?? {}, null, 2),
      'Skill results:',
      JSON.stringify(context.skillResults ?? [], null, 2),
      'Retrieval bundle:',
      JSON.stringify(context.retrievalBundle, null, 2),
      'Task:',
      'Analyze the operational context, identify concrete findings, assess risk level, and recommend safe next actions.',
    ].join('\n\n');

    return {
      systemPrompt,
      userPrompt,
    };
  }
}
