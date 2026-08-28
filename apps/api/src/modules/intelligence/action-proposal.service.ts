import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AiActionProposalEngineService } from './ai-action-proposal-engine.service';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { CreateActionProposalDto } from './dto/create-action-proposal.dto';
import { QueryActionProposalsDto } from './dto/query-action-proposals.dto';
import { RefreshActionProposalsDto } from './dto/refresh-action-proposals.dto';

const ACTIVE_PROPOSAL_STATUSES = ['PENDING', 'IN_REVIEW', 'NEEDS_REVISION', 'APPROVED'] as const;

@Injectable()
export class ActionProposalService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiActionProposalEngineService: AiActionProposalEngineService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async listActionProposals(principal: CurrentPrincipal, query: QueryActionProposalsDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );

    const proposals = await this.aiActionProposalEngineService.ensureCurrentProposals(
      principal,
      organizationId,
      false,
    );
    const filtered = query.status
      ? proposals.filter((proposal) => proposal.status === query.status)
      : proposals;

    return buildSuccessResponse(
      'AI action proposals retrieved successfully.',
      filtered.map((proposal) => this.aiActionProposalEngineService.toProposalView(proposal)),
    );
  }

  async refreshActionProposals(
    principal: CurrentPrincipal,
    dto: RefreshActionProposalsDto,
  ) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );
    const proposals = await this.aiActionProposalEngineService.ensureCurrentProposals(
      principal,
      organizationId,
      true,
    );

    return buildSuccessResponse(
      'AI action proposals refreshed successfully.',
      proposals.map((proposal) => this.aiActionProposalEngineService.toProposalView(proposal)),
    );
  }

  async createFromRecommendation(
    principal: CurrentPrincipal,
    dto: CreateActionProposalDto,
  ) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );

    const recommendation = await this.prismaService.aiRecommendation.findFirst({
      where: {
        id: dto.recommendationId,
        organizationId,
        isActive: true,
      },
    });

    if (!recommendation) {
      throw new NotFoundException({
        message: 'The requested recommendation could not be found.',
        error: {
          code: 'recommendation_not_found',
        },
      });
    }

    const existing = await this.prismaService.actionProposal.findMany({
      where: {
        organizationId,
        source: 'deterministic_recommendation',
        status: { in: [...ACTIVE_PROPOSAL_STATUSES] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const duplicate = existing.find(
      (proposal: (typeof existing)[number]) =>
        typeof proposal.metadata === 'object' &&
        proposal.metadata !== null &&
        'recommendationId' in (proposal.metadata as Record<string, unknown>) &&
        (proposal.metadata as Record<string, unknown>).recommendationId === recommendation.id,
    );

    if (duplicate) {
      throw new ConflictException({
        message: 'An active action proposal already exists for this recommendation.',
        error: {
          code: 'action_proposal_already_exists',
        },
      });
    }

    const proposal = await this.prismaService.actionProposal.create({
      data: {
        organizationId,
        proposalType: this.mapProposalType(
          this.getRecommendationType(recommendation),
        ),
        title: recommendation.title,
        description: recommendation.description,
        status: 'PENDING',
        source: 'deterministic_recommendation',
        priority: recommendation.priority,
        latestDecisionNote: null,
        metadata: {
          type: 'recommendation_review',
          summary: this.getRecommendationSummary(recommendation),
          reason: recommendation.rationale,
          evidence: this.getRecommendationEvidence(recommendation),
          targetEntityType: 'organization',
          targetEntityId: organizationId,
          riskLevel:
            recommendation.priority === 'CRITICAL' || recommendation.priority === 'HIGH'
              ? 'medium'
              : 'low',
          recommendedBy: 'recommendation_engine',
          safetyNotes: [
            'Requires human review.',
            'No direct external system write occurs from proposal generation.',
          ],
          recommendationId: recommendation.id,
          recommendationCategory: recommendation.category,
          recommendationType: this.getRecommendationType(recommendation),
          relatedSignalType: recommendation.relatedSignalType,
          rationale: recommendation.rationale,
          note: dto.note ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    this.logger.debug({
      event: 'ai.action_proposal.created',
      organizationId,
      proposalId: proposal.id,
      recommendationId: recommendation.id,
      proposalType: proposal.proposalType,
    });

    return buildSuccessResponse(
      'AI action proposal created successfully.',
      this.aiActionProposalEngineService.toProposalView(proposal),
    );
  }

  private mapProposalType(type: string) {
    switch (type) {
      case 'monitor_revenue_decline':
        return 'investigate_metric_drop';
      case 'improve_visibility':
        return 'review_visibility_gap';
      case 'investigate_customer_slowdown':
        return 'monitor_customer_decline';
      case 'reduce_product_concentration':
        return 'inspect_product_anomaly';
      case 'review_payment_reliability':
      case 'validate_unusual_change':
        return 'review_payment_connection';
      case 'capitalize_on_demand_spike':
        return 'inspect_product_anomaly';
      case 'review_sync_health':
      default:
        return 'review_store_sync_issue';
    }
  }

  private getRecommendationType(recommendation: {
    category: string;
    metadata: Prisma.JsonValue | null;
  }) {
    const metadata =
      recommendation.metadata &&
      typeof recommendation.metadata === 'object' &&
      !Array.isArray(recommendation.metadata)
        ? (recommendation.metadata as Record<string, unknown>)
        : null;

    return typeof metadata?.type === 'string' ? metadata.type : recommendation.category;
  }

  private getRecommendationSummary(recommendation: {
    description: string;
    metadata: Prisma.JsonValue | null;
  }) {
    const metadata =
      recommendation.metadata &&
      typeof recommendation.metadata === 'object' &&
      !Array.isArray(recommendation.metadata)
        ? (recommendation.metadata as Record<string, unknown>)
        : null;

    return typeof metadata?.summary === 'string' ? metadata.summary : recommendation.description;
  }

  private getRecommendationEvidence(recommendation: {
    rationale: string;
    metadata: Prisma.JsonValue | null;
  }) {
    const metadata =
      recommendation.metadata &&
      typeof recommendation.metadata === 'object' &&
      !Array.isArray(recommendation.metadata)
        ? (recommendation.metadata as Record<string, unknown>)
        : null;
    const evidence = Array.isArray(metadata?.evidence)
      ? metadata.evidence.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];

    return evidence.length > 0 ? evidence : [recommendation.rationale];
  }
}
