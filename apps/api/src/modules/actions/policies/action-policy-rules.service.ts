import { Injectable } from '@nestjs/common';

import { ActionExecutionRequest, ActionPolicyResult } from '../action.types';

@Injectable()
export class ActionPolicyRulesService {
  evaluate(request: ActionExecutionRequest): Partial<ActionPolicyResult> {
    const reasons: string[] = [];

    if (!request.organizationId) {
      reasons.push('Action execution requires organization scope.');
    }

    if (request.actionType === 'ESCALATE_INCIDENT' && !request.targetEntityId) {
      reasons.push('ESCALATE_INCIDENT requires a target incident id.');
    }

    if (request.actionType === 'RELEASE_ASSIGNMENT' && !request.targetEntityId) {
      reasons.push('RELEASE_ASSIGNMENT requires a target assignment id.');
    }

    return {
      allowed: reasons.length === 0,
      reasons,
    };
  }
}
