import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentActionProposalStatus, AgentRiskLevel, Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import { buildPaginatedResponse, buildSuccessResponse } from '../../shared/responses/response.util';
import { QueryAgentActionProposalsDto } from './dto/query-agent-action-proposals.dto';
import { QueryAgentRunsDto } from './dto/query-agent-runs.dto';

const agentRunSelect = {
  id: true,
  organizationId: true,
  triggerType: true,
  triggerSource: true,
  status: true,
  startedAt: true,
  completedAt: true,
  failedAt: true,
  cancelledAt: true,
  summary: true,
  errorMessage: true,
  requestId: true,
  entityType: true,
  entityId: true,
  inputContext: true,
  createdAt: true,
  updatedAt: true,
  agentDefinition: {
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      version: true,
    },
  },
  triggeredByUser: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  _count: {
    select: {
      actionProposals: true,
    },
  },
} satisfies Prisma.AgentRunSelect;

const observationSelect = {
  id: true,
  observationType: true,
  summary: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.AgentObservationSelect;

const decisionSelect = {
  id: true,
  decisionType: true,
  summary: true,
  rationale: true,
  confidence: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.AgentDecisionSelect;

const proposalSelect = {
  id: true,
  actionType: true,
  targetEntityType: true,
  targetEntityId: true,
  status: true,
  summary: true,
  payload: true,
  riskLevel: true,
  requiresApproval: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AgentActionProposalSelect;

@Injectable()
export class AgentHistoryService {
  constructor(private readonly prismaService: PrismaService) {}

  async listRuns(
    principal: CurrentPrincipal,
    query: QueryAgentRunsDto,
    allowedAgentCodes?: string[],
  ) {
    const { page, limit, skip } = resolvePagination(query);
    const organizationId = query.organizationId ?? principal.organizationId;
    this.ensureOrganizationScope(principal, organizationId);

    const where: Prisma.AgentRunWhereInput = {
      organizationId,
      ...this.buildAgentCodeWhere(query.agentCode, allowedAgentCodes),
      ...(query.status ? { status: query.status } : {}),
      ...(query.triggerType ? { triggerType: query.triggerType } : {}),
    };

    const [runs, total] = await this.prismaService.$transaction([
      this.prismaService.agentRun.findMany({
        where,
        select: agentRunSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.agentRun.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Agent runs retrieved successfully.',
      runs.map((run) => ({
        id: run.id,
        organizationId: run.organizationId,
        triggerType: run.triggerType,
        triggerSource: run.triggerSource,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        failedAt: run.failedAt,
        cancelledAt: run.cancelledAt,
        summary: run.summary,
        errorMessage: run.errorMessage,
        requestId: run.requestId,
        entityType: run.entityType,
        entityId: run.entityId,
        inputContext: run.inputContext,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        agentName: run.agentDefinition.name,
        agentCode: run.agentDefinition.code,
        agentCategory: run.agentDefinition.category,
        confidence: null,
        actionsProposed: run._count.actionProposals,
      })),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async listActionProposals(
    principal: CurrentPrincipal,
    query: QueryAgentActionProposalsDto,
  ) {
    const { page, limit, skip } = resolvePagination(query);
    const organizationId = query.organizationId ?? principal.organizationId;
    this.ensureOrganizationScope(principal, organizationId);

    const search = query.search?.trim();
    const where: Prisma.AgentActionProposalWhereInput = {
      agentRun: {
        organizationId,
        ...(query.agentCode ? { agentDefinition: { code: query.agentCode } } : {}),
      },
      ...(query.status ? { status: query.status as AgentActionProposalStatus } : {}),
      ...(query.riskLevel ? { riskLevel: query.riskLevel as AgentRiskLevel } : {}),
      ...(search
        ? {
            OR: [
              { summary: { contains: search, mode: 'insensitive' } },
              { actionType: { contains: search, mode: 'insensitive' } },
              { targetEntityId: { contains: search, mode: 'insensitive' } },
              { targetEntityType: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [proposals, total] = await this.prismaService.$transaction([
      this.prismaService.agentActionProposal.findMany({
        where,
        select: {
          ...proposalSelect,
          agentRunId: true,
          agentRun: {
            select: {
              organizationId: true,
              agentDefinition: {
                select: {
                  code: true,
                  name: true,
                },
              },
              decisions: {
                select: {
                  confidence: true,
                },
                orderBy: [{ createdAt: 'asc' }],
                take: 1,
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.agentActionProposal.count({ where }),
    ]);
    const executionLogs = proposals.length
      ? await this.prismaService.actionExecutionLog.findMany({
          where: {
            proposalId: { in: proposals.map((proposal) => proposal.id) },
          },
          select: {
            proposalId: true,
            executionStatus: true,
            approvalRequestId: true,
            resultSummary: true,
            startedAt: true,
            finishedAt: true,
          },
          orderBy: [{ startedAt: 'desc' }],
        })
      : [];
    const latestExecutionByProposalId = new Map<
      string,
      {
        executionStatus: string;
        approvalRequestId: string | null;
        resultSummary: string | null;
        startedAt: Date;
        finishedAt: Date | null;
      }
    >();
    for (const log of executionLogs) {
      if (!latestExecutionByProposalId.has(log.proposalId)) {
        latestExecutionByProposalId.set(log.proposalId, log);
      }
    }

    return buildPaginatedResponse(
      'Agent action proposals retrieved successfully.',
      proposals.map((proposal) => {
        const execution = latestExecutionByProposalId.get(proposal.id);
        return {
        id: proposal.id,
        runId: proposal.agentRunId,
        agentName: proposal.agentRun.agentDefinition.name,
        agentCode: proposal.agentRun.agentDefinition.code,
        organizationId: proposal.agentRun.organizationId,
        actionType: proposal.actionType,
        targetEntityType: proposal.targetEntityType,
        targetEntityId: proposal.targetEntityId,
        status: proposal.status,
        summary: proposal.summary,
        payload: proposal.payload,
        riskLevel: proposal.riskLevel,
        requiresApproval: proposal.requiresApproval,
        confidence: proposal.agentRun.decisions[0]?.confidence ?? null,
        executionStatus: execution?.executionStatus ?? null,
        approvalRequestId: execution?.approvalRequestId ?? null,
        executionSummary: execution?.resultSummary ?? null,
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt,
      };
      }),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getRun(principal: CurrentPrincipal, id: string, allowedAgentCodes?: string[]) {
    const run = await this.prismaService.agentRun.findUnique({
      where: { id },
      select: {
        ...agentRunSelect,
        observations: {
          select: observationSelect,
          orderBy: [{ createdAt: 'asc' }],
        },
        decisions: {
          select: decisionSelect,
          orderBy: [{ createdAt: 'asc' }],
        },
        actionProposals: {
          select: proposalSelect,
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Agent run not found.');
    }

    this.ensureOrganizationScope(principal, run.organizationId);
    this.ensureAllowedAgentCode(run.agentDefinition.code, allowedAgentCodes);

    return buildSuccessResponse('Agent run retrieved successfully.', run);
  }

  async getRunObservations(principal: CurrentPrincipal, runId: string) {
    await this.ensureRunScope(principal, runId);

    const observations = await this.prismaService.agentObservation.findMany({
      where: { agentRunId: runId },
      select: observationSelect,
      orderBy: [{ createdAt: 'asc' }],
    });

    return buildSuccessResponse('Agent observations retrieved successfully.', observations);
  }

  async getRunDecisions(principal: CurrentPrincipal, runId: string) {
    await this.ensureRunScope(principal, runId);

    const decisions = await this.prismaService.agentDecision.findMany({
      where: { agentRunId: runId },
      select: decisionSelect,
      orderBy: [{ createdAt: 'asc' }],
    });

    return buildSuccessResponse('Agent decisions retrieved successfully.', decisions);
  }

  async getRunActionProposals(principal: CurrentPrincipal, runId: string) {
    await this.ensureRunScope(principal, runId);

    const proposals = await this.prismaService.agentActionProposal.findMany({
      where: { agentRunId: runId },
      select: proposalSelect,
      orderBy: [{ createdAt: 'asc' }],
    });

    return buildSuccessResponse('Agent action proposals retrieved successfully.', proposals);
  }

  private async ensureRunScope(principal: CurrentPrincipal, runId: string) {
    const run = await this.prismaService.agentRun.findUnique({
      where: { id: runId },
      select: { id: true, organizationId: true },
    });

    if (!run) {
      throw new NotFoundException('Agent run not found.');
    }

    this.ensureOrganizationScope(principal, run.organizationId);
  }

  private ensureOrganizationScope(
    principal: CurrentPrincipal,
    organizationId: string | null,
  ) {
    if (organizationId && principal.organizationId !== organizationId) {
      throw new NotFoundException('Agent run not found.');
    }
  }

  private buildAgentCodeWhere(agentCode?: string, allowedAgentCodes?: string[]) {
    if (agentCode) {
      return { agentDefinition: { code: agentCode } } satisfies Prisma.AgentRunWhereInput;
    }

    if (allowedAgentCodes?.length) {
      return {
        agentDefinition: {
          code: {
            in: allowedAgentCodes,
          },
        },
      } satisfies Prisma.AgentRunWhereInput;
    }

    return {};
  }

  private ensureAllowedAgentCode(agentCode: string, allowedAgentCodes?: string[]) {
    if (allowedAgentCodes?.length && !allowedAgentCodes.includes(agentCode)) {
      throw new NotFoundException('Agent run not found.');
    }
  }
}
