import { Injectable } from '@nestjs/common';
import { AgentTriggerType } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AgentRunnerService } from './agent-runner.service';
import { COMMERCE_AGENT_KEYS } from './commerce-agent.constants';
import { CreateAgentRunDto } from './dto/create-agent-run.dto';
import { ReviewAgentActionProposalDto } from './dto/review-agent-action-proposal.dto';
import { AgentExecutionService } from './execution.service';

const commerceAgentsByTrigger: Record<string, string[]> = {
  shopify_sync_completed: [
    'commerce_health_agent',
    'revenue_monitor_agent',
    'customer_momentum_agent',
    'integration_guard_agent',
  ],
  no_orders_detected: ['revenue_monitor_agent'],
  stripe_not_connected: ['integration_guard_agent', 'revenue_monitor_agent'],
  data_restriction_detected: ['integration_guard_agent', 'customer_momentum_agent'],
};

@Injectable()
export class AgentRuntimeService {
  constructor(
    private readonly agentRunnerService: AgentRunnerService,
    private readonly agentExecutionService: AgentExecutionService,
  ) {}

  async createRun(principal: CurrentPrincipal, dto: CreateAgentRunDto) {
    if (dto.agentCode) {
      return this.agentRunnerService.createRun(principal, dto);
    }

    const triggerSource = dto.triggerSource?.trim().toLowerCase();
    const agentCodes = triggerSource ? commerceAgentsByTrigger[triggerSource] : null;

    if (!agentCodes?.length) {
      return this.agentRunnerService.createRun(principal, {
        ...dto,
        agentCode: COMMERCE_AGENT_KEYS[0],
        triggerType: dto.triggerType ?? AgentTriggerType.API,
      });
    }

    const runs = await Promise.all(
      agentCodes.map((agentCode) =>
        this.agentRunnerService.createRun(principal, {
          ...dto,
          agentCode,
          triggerType: dto.triggerType ?? AgentTriggerType.EVENT_DRIVEN,
          inputContext: {
            ...(dto.inputContext ?? {}),
            triggerSource,
          },
        }),
      ),
    );

    return buildSuccessResponse('Agent trigger processed successfully.', {
      triggerSource,
      runs: runs.map((run) => run.data),
    });
  }

  createAutomatedRun(dto: CreateAgentRunDto, triggerSource: string) {
    return this.agentRunnerService.createAutomatedRun(dto, triggerSource);
  }

  reviewActionProposal(
    principal: CurrentPrincipal,
    proposalId: string,
    dto: ReviewAgentActionProposalDto,
  ) {
    return this.agentRunnerService.reviewActionProposal(principal, proposalId, dto);
  }

  executeApprovedProposal(proposalId: string, actorUserId?: string | null) {
    return this.agentExecutionService.executeApprovedProposal(proposalId, actorUserId);
  }
}
