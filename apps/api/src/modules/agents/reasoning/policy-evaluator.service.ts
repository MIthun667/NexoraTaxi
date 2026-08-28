import { Injectable } from '@nestjs/common';

import { AgentPolicyService, ProposedAgentActionInput } from '../agent-policy.service';
import { ActionProposalRequest } from './reasoning.types';

@Injectable()
export class PolicyEvaluatorService {
  constructor(private readonly agentPolicyService: AgentPolicyService) {}

  evaluate(agentDefinitionId: string, proposals: ActionProposalRequest[]) {
    return Promise.all(
      proposals.map((proposal) =>
        this.agentPolicyService.evaluate(agentDefinitionId, {
          actionType: proposal.actionType,
          summary: proposal.summary,
          targetEntityType: proposal.targetEntityType ?? null,
          targetEntityId: proposal.targetEntityId ?? null,
          payload: proposal.payload,
        } satisfies ProposedAgentActionInput),
      ),
    );
  }
}
