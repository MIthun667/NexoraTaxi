import { AgentRiskLevel } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AgentPolicyService } from '../agents/agent-policy.service';
import { ActionProposalRecord, ActionExecutionRequest, ActionPolicyResult } from './action.types';
import { ActionPolicyRulesService } from './policies/action-policy-rules.service';

@Injectable()
export class ActionPolicyService {
  constructor(
    private readonly agentPolicyService: AgentPolicyService,
    private readonly actionPolicyRulesService: ActionPolicyRulesService,
  ) {}

  async evaluate(
    proposal: ActionProposalRecord,
    request: ActionExecutionRequest,
  ): Promise<ActionPolicyResult> {
    const agentPolicy = await this.agentPolicyService.evaluate(proposal.agentRun.agentDefinition.id, {
      actionType: request.actionType,
      summary: request.summary,
      targetEntityId: request.targetEntityId ?? null,
      targetEntityType: request.targetEntityType ?? null,
      payload: (request.payload ?? undefined) as Prisma.InputJsonValue | undefined,
    });

    const localPolicy = this.actionPolicyRulesService.evaluate(request);
    const reasons = [
      ...(localPolicy.reasons ?? []),
      ...(!agentPolicy || agentPolicy.status === 'CANCELLED' ? ['Agent policy disabled this action.'] : []),
    ];

    const effectiveRisk = proposal.riskLevel ?? agentPolicy.riskLevel ?? AgentRiskLevel.MEDIUM;
    const requiresApproval = proposal.requiresApproval || agentPolicy.requiresApproval || effectiveRisk === AgentRiskLevel.HIGH || effectiveRisk === AgentRiskLevel.CRITICAL;
    const allowed = (localPolicy.allowed ?? true) && agentPolicy.status !== 'CANCELLED';

    return {
      allowed,
      requiresApproval,
      effectiveRisk,
      reasons,
    };
  }
}
