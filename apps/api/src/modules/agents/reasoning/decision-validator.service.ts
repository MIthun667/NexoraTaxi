import { Injectable } from '@nestjs/common';

import { UNIVERSAL_RETRIEVAL_ENTITY_TYPES } from '../../retrieval/retrieval.constants';
import { AgentReasoningOutput, DecisionValidationResult, ReasoningContext } from './reasoning.types';

@Injectable()
export class DecisionValidatorService {
  validate(output: AgentReasoningOutput, context: ReasoningContext): DecisionValidationResult {
    const warnings: string[] = [];

    const normalizedOutput: AgentReasoningOutput = {
      ...output,
      recommended_actions: output.recommended_actions.filter((action) => {
        if (!action.action_type?.trim()) {
          warnings.push('Dropped an empty action_type recommendation.');
          return false;
        }

        if (
          action.target_entity_type &&
          !UNIVERSAL_RETRIEVAL_ENTITY_TYPES.includes(
            action.target_entity_type as (typeof UNIVERSAL_RETRIEVAL_ENTITY_TYPES)[number],
          ) &&
          action.target_entity_type !== context.entityType
        ) {
          warnings.push(`Recommendation target entity type ${action.target_entity_type} is outside the supported universal set.`);
        }

        if (
          context.entityId &&
          action.target_entity_id &&
          action.target_entity_type === context.entityType &&
          action.target_entity_id !== context.entityId
        ) {
          warnings.push(`Recommendation references a different target entity id (${action.target_entity_id}) than the current context.`);
        }

        return true;
      }),
    };

    if (!normalizedOutput.summary.trim()) {
      warnings.push('Reasoning summary is empty after normalization.');
    }

    return {
      isValid: true,
      normalizedOutput,
      warnings,
    };
  }
}
