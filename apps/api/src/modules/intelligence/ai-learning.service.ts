import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ActionExecutionStatus, ActionOutcomeType, Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { QueryLearningInsightsDto } from './dto/query-learning-insights.dto';
import { RecordLearningOutcomeDto } from './dto/record-learning-outcome.dto';

@Injectable()
export class AiLearningService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async recordOutcome(
    principal: CurrentPrincipal,
    executionId: string,
    outcomeData: Pick<RecordLearningOutcomeDto, 'outcomeType' | 'outcomeScore' | 'impactMetrics' | 'notes'>,
  ) {
    const execution = await this.prismaService.actionExecution.findUnique({
      where: { id: executionId },
      include: {
        proposal: {
          select: {
            metadata: true,
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException('Action execution not found.');
    }

    await this.aiCommerceMetricsService.resolveOrganizationScope(principal, execution.organizationId);

    if (
      execution.status !== ActionExecutionStatus.COMPLETED &&
      execution.status !== ActionExecutionStatus.FAILED &&
      execution.status !== ActionExecutionStatus.REJECTED
    ) {
      throw new BadRequestException('Action outcome can only be recorded after execution is finalized.');
    }

    const recommendationId = this.extractRecommendationId(execution.proposal?.metadata ?? null);
    const outcome = await this.prismaService.actionOutcome.upsert({
      where: { executionId },
      create: {
        executionId,
        proposalId: execution.proposalId,
        recommendationId,
        organizationId: execution.organizationId,
        outcomeType: outcomeData.outcomeType ?? ActionOutcomeType.UNKNOWN,
        outcomeScore: outcomeData.outcomeScore ?? this.defaultOutcomeScore(outcomeData.outcomeType),
        impactMetrics: this.asJsonObject(outcomeData.impactMetrics),
        notes: outcomeData.notes,
      },
      update: {
        recommendationId,
        outcomeType: outcomeData.outcomeType ?? ActionOutcomeType.UNKNOWN,
        outcomeScore: outcomeData.outcomeScore ?? this.defaultOutcomeScore(outcomeData.outcomeType),
        impactMetrics: this.asJsonObject(outcomeData.impactMetrics),
        notes: outcomeData.notes,
      },
    });

    this.logger.log({
      event: 'ai.learning.outcome_recorded',
      organizationId: execution.organizationId,
      executionId,
      outcomeType: outcome.outcomeType,
      score: outcome.outcomeScore,
    });

    return buildSuccessResponse('Action outcome recorded successfully.', outcome);
  }

  async recordDecision(
    principal: CurrentPrincipal,
    proposalId: string,
    decisionData: { decision: string; reason?: string | null; metadata?: Prisma.InputJsonValue },
  ) {
    const proposal = await this.prismaService.actionProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException('Action proposal not found.');
    }

    await this.aiCommerceMetricsService.resolveOrganizationScope(principal, proposal.organizationId);

    const log = await this.prismaService.decisionLog.create({
      data: {
        proposalId,
        organizationId: proposal.organizationId,
        decision: decisionData.decision,
        decidedByUserId: principal.userId,
        reason: decisionData.reason,
        metadata: this.asJsonObject(decisionData.metadata),
      },
    });

    return buildSuccessResponse('Operator decision logged successfully.', log);
  }

  async getLearningInsights(principal: CurrentPrincipal, query: QueryLearningInsightsDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );

    const [outcomes, decisions] = await Promise.all([
      this.prismaService.actionOutcome.findMany({
        where: { organizationId },
        orderBy: { recordedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          executionId: true,
          proposalId: true,
          recommendationId: true,
          outcomeType: true,
          outcomeScore: true,
          impactMetrics: true,
          notes: true,
          recordedAt: true,
        },
      }),
      this.prismaService.decisionLog.findMany({
        where: { organizationId },
        orderBy: { decidedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          proposalId: true,
          decision: true,
          decidedByUserId: true,
          decidedAt: true,
          reason: true,
          metadata: true,
        },
      }),
    ]);

    const totalOutcomes = outcomes.length;
    const positiveOutcomes = outcomes.filter((outcome) => outcome.outcomeType === ActionOutcomeType.POSITIVE).length;
    const approvalRate =
      decisions.length > 0
        ? decisions.filter((decision) => decision.decision === 'APPROVED').length / decisions.length
        : 0;

    return buildSuccessResponse('Learning insights retrieved.', {
      summary: {
        totalActionsTracked: totalOutcomes,
        positiveOutcomeRate: totalOutcomes > 0 ? positiveOutcomes / totalOutcomes : 0,
        operatorApprovalRate: approvalRate,
      },
      recentOutcomes: outcomes,
      recentDecisions: decisions,
    });
  }

  /**
   * Returns a multiplier for recommendation scores based on historical effectiveness.
   * Phase 1: Simple deterministic lookups.
   */
  async getHistoricalEffectivenessScore(organizationId: string, recommendationType: string): Promise<number> {
    const outcomes = await this.prismaService.actionOutcome.findMany({
      where: {
        organizationId,
        execution: {
          proposal: {
            metadata: {
              path: ['recommendationType'],
              equals: recommendationType,
            },
          },
        }
      },
      orderBy: { recordedAt: 'desc' },
      take: 10,
    });

    if (outcomes.length === 0) return 1.0;

    const positiveCount = outcomes.filter((outcome) => outcome.outcomeType === ActionOutcomeType.POSITIVE).length;
    const negativeCount = outcomes.filter((outcome) => outcome.outcomeType === ActionOutcomeType.NEGATIVE).length;

    let score = 1.0;
    score += Math.min(positiveCount * 0.1, 0.5);
    score -= Math.min(negativeCount * 0.2, 0.6);

    return Math.max(0.4, Math.min(score, 1.5));
  }

  async getDecisionBiasScore(organizationId: string, recommendationType: string): Promise<number> {
    const decisions = await this.prismaService.decisionLog.findMany({
      where: {
        organizationId,
        proposal: {
          metadata: {
            path: ['recommendationType'],
            equals: recommendationType,
          },
        },
      },
      orderBy: { decidedAt: 'desc' },
      take: 10,
    });

    if (decisions.length === 0) return 1.0;

    const rejectedCount = decisions.filter(
      (decision) => decision.decision === 'REJECTED' || decision.decision === 'DISMISSED',
    ).length;

    if (rejectedCount >= 5) return 0.6;
    if (rejectedCount >= 3) return 0.8;

    return 1.0;
  }

  private defaultOutcomeScore(outcomeType?: ActionOutcomeType) {
    if (outcomeType === ActionOutcomeType.POSITIVE) {
      return 1;
    }

    if (outcomeType === ActionOutcomeType.NEGATIVE) {
      return -1;
    }

    return 0;
  }

  private extractRecommendationId(metadata: Prisma.JsonValue | null) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const record = metadata as Record<string, unknown>;

    return typeof record.recommendationId === 'string' ? record.recommendationId : null;
  }

  private asJsonObject(value: Prisma.InputJsonValue | Record<string, unknown> | null | undefined) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Prisma.InputJsonObject;
  }
}
