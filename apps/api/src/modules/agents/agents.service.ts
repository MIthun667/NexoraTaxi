import { BadRequestException, Injectable } from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import {
  COMMERCE_AGENT_KEYS,
  isCommerceAgentKey,
} from './commerce-agent.constants';
import { CommerceAgentOrchestrationService } from './commerce-agent-orchestration.service';
import { AgentHistoryService } from './agent-history.service';
import { AgentRegistryService } from './agent-registry.service';
import { AgentRuntimeService } from './agent-runtime.service';
import { CreateAgentRunDto } from './dto/create-agent-run.dto';
import { QueryCommerceAgentRunsDto } from './dto/query-commerce-agent-runs.dto';
import { QueryAgentActionProposalsDto } from './dto/query-agent-action-proposals.dto';
import { QueryAgentDefinitionsDto } from './dto/query-agent-definitions.dto';
import { QueryAgentRunsDto } from './dto/query-agent-runs.dto';
import { ReviewAgentActionProposalDto } from './dto/review-agent-action-proposal.dto';
import { QueryAgentTriggersDto } from './dto/query-agent-triggers.dto';
import { OrchestrateCommerceAgentsDto } from './dto/orchestrate-commerce-agents.dto';
import { RunCommerceAgentDto } from './dto/run-commerce-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    private readonly agentRegistryService: AgentRegistryService,
    private readonly agentRuntimeService: AgentRuntimeService,
    private readonly agentHistoryService: AgentHistoryService,
    private readonly commerceAgentOrchestrationService: CommerceAgentOrchestrationService,
  ) {}

  async listDefinitions(query: QueryAgentDefinitionsDto) {
    const definitions = await this.agentRegistryService.listDefinitions({
      ...(query.category ? { category: query.category } : {}),
      ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
    });

    return buildSuccessResponse('Agent definitions retrieved successfully.', definitions);
  }

  async getDefinition(id: string) {
    const definition = await this.agentRegistryService.getDefinitionById(id);
    return buildSuccessResponse('Agent definition retrieved successfully.', definition);
  }

  async listCommerceDefinitions() {
    const definitions = await this.agentRegistryService.listDefinitions({
      code: { in: [...COMMERCE_AGENT_KEYS] },
    });

    return buildSuccessResponse(
      'Commerce agents retrieved successfully.',
      definitions.map((definition) => {
        const metadata = this.agentRegistryService.getCommerceDefinitionMetadata(
          definition.code,
        );

        return {
          id: definition.id,
          key: definition.code,
          name: definition.name,
          domain: metadata?.domain ?? 'commerce',
          description: definition.description,
          capabilities: metadata?.capabilities ?? [],
          status: definition.isActive ? 'active' : 'disabled',
          createdAt: definition.createdAt,
          updatedAt: definition.updatedAt,
        };
      }),
    );
  }

  createRun(principal: CurrentPrincipal, dto: CreateAgentRunDto) {
    return this.agentRuntimeService.createRun(principal, dto);
  }

  listRuns(principal: CurrentPrincipal, query: QueryAgentRunsDto) {
    return this.agentHistoryService.listRuns(principal, query);
  }

  getRun(principal: CurrentPrincipal, id: string) {
    return this.agentHistoryService.getRun(principal, id);
  }

  listCommerceRuns(principal: CurrentPrincipal, query: QueryCommerceAgentRunsDto) {
    return this.agentHistoryService.listRuns(
      principal,
      {
        ...query,
        agentCode: query.agentKey,
      } as QueryAgentRunsDto,
      [...COMMERCE_AGENT_KEYS],
    );
  }

  getCommerceRun(principal: CurrentPrincipal, id: string) {
    return this.agentHistoryService.getRun(principal, id, [...COMMERCE_AGENT_KEYS]);
  }

  listTriggers(principal: CurrentPrincipal, query: QueryAgentTriggersDto) {
    return this.commerceAgentOrchestrationService.listTriggers(principal, query);
  }

  getTrigger(principal: CurrentPrincipal, id: string) {
    return this.commerceAgentOrchestrationService.getTrigger(principal, id);
  }

  orchestrate(principal: CurrentPrincipal, dto: OrchestrateCommerceAgentsDto) {
    return this.commerceAgentOrchestrationService.orchestrate(principal, dto);
  }

  runCommerceAgent(
    principal: CurrentPrincipal,
    key: string,
    dto: RunCommerceAgentDto,
  ) {
    if (!isCommerceAgentKey(key)) {
      throw new BadRequestException('Unsupported commerce agent key.');
    }

    return this.commerceAgentOrchestrationService.runManualAgent(principal, key, {
      ...dto,
      agentCode: key,
    } as CreateAgentRunDto);
  }

  getRunObservations(principal: CurrentPrincipal, id: string) {
    return this.agentHistoryService.getRunObservations(principal, id);
  }

  getRunDecisions(principal: CurrentPrincipal, id: string) {
    return this.agentHistoryService.getRunDecisions(principal, id);
  }

  getRunActionProposals(principal: CurrentPrincipal, id: string) {
    return this.agentHistoryService.getRunActionProposals(principal, id);
  }

  listActionProposals(principal: CurrentPrincipal, query: QueryAgentActionProposalsDto) {
    return this.agentHistoryService.listActionProposals(principal, query);
  }

  reviewActionProposal(
    principal: CurrentPrincipal,
    id: string,
    dto: ReviewAgentActionProposalDto,
  ) {
    return this.agentRuntimeService.reviewActionProposal(principal, id, dto);
  }
}
