import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, resolvePagination } from '../../shared/pagination/pagination.util';
import { buildPaginatedResponse, buildSuccessResponse } from '../../shared/responses/response.util';
import { AiActionProposalEngineService } from './ai-action-proposal-engine.service';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { AiLearningService } from './ai-learning.service';
import { AiNotificationService } from './ai-notification.service';
import { QueryActionProposalsDto } from './dto/query-action-proposals.dto';
import { ReviewActionProposalDto } from './dto/review-action-proposal.dto';
import { WorkflowAuditService } from './workflow-audit.service';

const PENDING_STATUSES = ['PENDING', 'IN_REVIEW', 'NEEDS_REVISION'] as const;

@Injectable()
export class ActionProposalReviewService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiActionProposalEngineService: AiActionProposalEngineService,
    private readonly aiLearningService: AiLearningService,
    private readonly aiNotificationService: AiNotificationService,
    private readonly workflowAuditService: WorkflowAuditService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async listPendingProposals(principal: CurrentPrincipal, query: QueryActionProposalsDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const { page, limit, skip } = resolvePagination(query);
    const where: Prisma.ActionProposalWhereInput = {
      organizationId,
      status: { in: [...PENDING_STATUSES] },
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.actionProposal.findMany({
        where,
        include: {
          reviews: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prismaService.actionProposal.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Pending action proposals retrieved successfully.',
      items.map((item) => this.aiActionProposalEngineService.toProposalView(item)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async listProposalHistory(principal: CurrentPrincipal, query: QueryActionProposalsDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const { page, limit, skip } = resolvePagination(query);
    const where: Prisma.ActionProposalWhereInput = {
      organizationId,
      status: { notIn: [...PENDING_STATUSES] },
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.actionProposal.findMany({
        where,
        include: {
          reviews: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.actionProposal.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Action proposal history retrieved successfully.',
      items.map((item) => this.aiActionProposalEngineService.toProposalView(item)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async submitProposalForReview(principal: CurrentPrincipal, dto: ReviewActionProposalDto) {
    const proposal = await this.requireProposal(principal, dto.organizationId, dto.actionProposalId);

    if (proposal.status !== 'PENDING' && proposal.status !== 'NEEDS_REVISION') {
      throw new BadRequestException({
        message: 'The proposal cannot be submitted for review from its current state.',
        error: { code: 'invalid_action_proposal_transition' },
      });
    }

    const updated = await this.prismaService.actionProposal.update({
      where: { id: proposal.id },
      data: {
        status: 'IN_REVIEW',
        latestDecisionNote: dto.note ?? proposal.latestDecisionNote,
      },
      include: { reviews: { orderBy: { createdAt: 'desc' } } },
    });

    await this.workflowAuditService.recordProposalLifecycle({
      organizationId: proposal.organizationId,
      proposalId: proposal.id,
      actorUserId: principal.userId,
      action: 'ai.action_proposal.submitted_for_review',
      summary: 'Action proposal was submitted for formal review.',
      metadata: {
        proposalType: proposal.proposalType,
        note: dto.note ?? null,
      } as Prisma.InputJsonValue,
    });

    return buildSuccessResponse('Action proposal submitted for review successfully.', updated);
  }

  async approveProposal(principal: CurrentPrincipal, dto: ReviewActionProposalDto) {
    return this.applyDecision(principal, dto, 'APPROVED');
  }

  async rejectProposal(principal: CurrentPrincipal, dto: ReviewActionProposalDto) {
    return this.applyDecision(principal, dto, 'REJECTED');
  }

  async requestProposalRevision(principal: CurrentPrincipal, dto: ReviewActionProposalDto) {
    return this.applyDecision(principal, dto, 'NEEDS_REVISION');
  }

  async deferProposal(principal: CurrentPrincipal, dto: ReviewActionProposalDto) {
    return this.applyDecision(principal, dto, 'DEFERRED');
  }

  private async applyDecision(
    principal: CurrentPrincipal,
    dto: ReviewActionProposalDto,
    decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION' | 'DEFERRED',
  ) {
    const proposal = await this.requireProposal(principal, dto.organizationId, dto.actionProposalId);

    if (!PENDING_STATUSES.includes(proposal.status as (typeof PENDING_STATUSES)[number])) {
      throw new BadRequestException({
        message: 'The proposal has already been fully reviewed.',
        error: { code: 'invalid_action_proposal_transition' },
      });
    }

    const [updated] = await this.prismaService.$transaction([
      this.prismaService.actionProposal.update({
        where: { id: proposal.id },
        data: {
          status: decision,
          reviewedAt: new Date(),
          reviewedByUserId: principal.userId,
          latestDecisionNote: dto.note ?? null,
        },
        include: {
          reviews: { orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prismaService.actionProposalReview.create({
        data: {
          organizationId: proposal.organizationId,
          actionProposalId: proposal.id,
          reviewerUserId: principal.userId,
          decision,
          note: dto.note ?? null,
        },
      }),
    ]);

    await this.workflowAuditService.recordProposalLifecycle({
      organizationId: proposal.organizationId,
      proposalId: proposal.id,
      actorUserId: principal.userId,
      action: `ai.action_proposal.${decision.toLowerCase()}`,
      summary: `Action proposal was ${decision.toLowerCase().replace('_', ' ')}.`,
      metadata: {
        proposalType: proposal.proposalType,
        decision,
        note: dto.note ?? null,
      } as Prisma.InputJsonValue,
    });

    await this.aiNotificationService.notifyProposalDecision({
      organizationId: proposal.organizationId,
      proposalId: proposal.id,
      title: proposal.title,
      decision,
      note: dto.note ?? null,
    });

    // Record decision for learning loop
    await this.aiLearningService.recordDecision(principal, proposal.id, {
      decision,
      reason: dto.note ?? null,
    });

    this.logger.debug({
      event: 'ai.action_proposal.reviewed',
      organizationId: proposal.organizationId,
      proposalId: proposal.id,
      decision,
      reviewerUserId: principal.userId,
    });

    return buildSuccessResponse(
      `Action proposal ${decision.toLowerCase().replace('_', ' ')} successfully.`,
      this.aiActionProposalEngineService.toProposalView(updated),
    );
  }

  private async requireProposal(
    principal: CurrentPrincipal,
    organizationId: string,
    actionProposalId: string,
  ) {
    const scopedOrganizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      organizationId,
    );

    const proposal = await this.prismaService.actionProposal.findFirst({
      where: {
        id: actionProposalId,
        organizationId: scopedOrganizationId,
      },
    });

    if (!proposal) {
      throw new NotFoundException({
        message: 'The requested action proposal could not be found.',
        error: { code: 'action_proposal_not_found' },
      });
    }

    return proposal;
  }
}
