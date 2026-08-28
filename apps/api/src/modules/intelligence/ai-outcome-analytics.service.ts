import { Injectable } from '@nestjs/common';
import { ActionOutcomeType, Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { AiDataTrustService, CanonicalDataTrustStatus } from './ai-data-trust.service';
import { QueryOutcomeAnalyticsDto } from './dto/query-outcome-analytics.dto';
import { PrismaService } from '../../prisma/prisma.service';

type OutcomeEffectivenessItem = {
  type: string;
  usageCount: number;
  positiveOutcomeRate: number;
  operatorApprovalRate: number;
  executionSuccessRate: number;
};

type LearningTrendStatus = 'improving' | 'stable' | 'weakening' | 'insufficient_data';

export type OutcomeAnalyticsResponse = {
  organizationId: string;
  generatedAt: string;
  trust: CanonicalDataTrustStatus;
  summary: string;
  actionVolume: {
    actionsExecuted: number;
    proposalsReviewed: number;
    approvals: number;
    rejections: number;
    deferrals: number;
    pendingReviewCount: number;
    lookbackDays: number;
  };
  outcomeSummary: {
    positive: number;
    neutral: number;
    negative: number;
    unknown: number;
    totalRecorded: number;
    positiveOutcomeRate: number;
  };
  recommendationEffectiveness: {
    topEffective: OutcomeEffectivenessItem[];
    weaker: OutcomeEffectivenessItem[];
  };
  proposalReviewPatterns: {
    approvalRate: number;
    rejectionRate: number;
    deferRate: number;
    repeatedRejectionThemes: string[];
  };
  executionReliability: {
    completed: number;
    failed: number;
    approvalPending: number;
    successRate: number;
    failureByType: Array<{
      type: string;
      failedCount: number;
      total: number;
    }>;
  };
  learningTrend: {
    status: LearningTrendStatus;
    summary: string;
    recentPositiveOutcomeRate: number | null;
    previousPositiveOutcomeRate: number | null;
  };
  roiHighlights: string[];
  limitations: string[];
};

@Injectable()
export class AiOutcomeAnalyticsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiDataTrustService: AiDataTrustService,
  ) {}

  async getOutcomeAnalytics(principal: CurrentPrincipal, query: QueryOutcomeAnalyticsDto) {
    const payload = await this.getOutcomeAnalyticsPayload(
      principal,
      query.organizationId,
      query.lookbackDays,
    );

    return buildSuccessResponse('Outcome analytics retrieved successfully.', payload);
  }

  async refreshOutcomeAnalytics(principal: CurrentPrincipal, dto: QueryOutcomeAnalyticsDto) {
    const payload = await this.getOutcomeAnalyticsPayload(
      principal,
      dto.organizationId,
      dto.lookbackDays,
    );

    return buildSuccessResponse('Outcome analytics refreshed successfully.', payload);
  }

  async getOutcomeAnalyticsPayload(
    principal: CurrentPrincipal,
    organizationId: string | undefined,
    lookbackDays = 30,
  ): Promise<OutcomeAnalyticsResponse> {
    const scopedOrganizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      organizationId,
    );
    const trust = await this.aiDataTrustService.getTrustForOrganization(scopedOrganizationId);
    const since = this.daysAgo(lookbackDays);

    const [outcomes, decisions, executions, pendingReviewCount] = await Promise.all([
      this.prismaService.actionOutcome.findMany({
        where: { organizationId: scopedOrganizationId, recordedAt: { gte: since } },
        orderBy: { recordedAt: 'desc' },
        include: {
          execution: {
            select: {
              id: true,
              type: true,
              status: true,
              proposal: {
                select: {
                  id: true,
                  proposalType: true,
                  title: true,
                  metadata: true,
                },
              },
            },
          },
        },
      }),
      this.prismaService.decisionLog.findMany({
        where: { organizationId: scopedOrganizationId, decidedAt: { gte: since } },
        orderBy: { decidedAt: 'desc' },
        include: {
          proposal: {
            select: {
              id: true,
              proposalType: true,
              title: true,
              metadata: true,
            },
          },
        },
      }),
      this.prismaService.actionExecution.findMany({
        where: { organizationId: scopedOrganizationId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        include: {
          proposal: {
            select: {
              id: true,
              proposalType: true,
              title: true,
              metadata: true,
            },
          },
          outcome: true,
        },
      }),
      this.prismaService.actionProposal.count({
        where: {
          organizationId: scopedOrganizationId,
          createdAt: { gte: since },
          status: { in: ['PENDING', 'IN_REVIEW', 'NEEDS_REVISION', 'DEFERRED'] },
        },
      }),
    ]);

    const actionVolume = this.buildActionVolume(executions, decisions, pendingReviewCount, lookbackDays);
    const outcomeSummary = this.buildOutcomeSummary(outcomes);
    const recommendationEffectiveness = this.buildRecommendationEffectiveness(outcomes, decisions, executions);
    const proposalReviewPatterns = this.buildProposalReviewPatterns(decisions);
    const executionReliability = this.buildExecutionReliability(executions);
    const learningTrend = this.buildLearningTrend(outcomes);
    const limitations = this.buildLimitations(trust, actionVolume.actionsExecuted, outcomeSummary.totalRecorded);
    const roiHighlights = this.buildRoiHighlights({
      trust,
      actionVolume,
      outcomeSummary,
      recommendationEffectiveness,
      proposalReviewPatterns,
      executionReliability,
      learningTrend,
      limitations,
    });
    const summary = this.buildSummary({
      trust,
      actionVolume,
      outcomeSummary,
      learningTrend,
      roiHighlights,
      limitations,
    });

    return {
      organizationId: scopedOrganizationId,
      generatedAt: new Date().toISOString(),
      trust,
      summary,
      actionVolume,
      outcomeSummary,
      recommendationEffectiveness,
      proposalReviewPatterns,
      executionReliability,
      learningTrend,
      roiHighlights,
      limitations,
    };
  }

  private buildActionVolume(
    executions: Array<{ id: string }>,
    decisions: Array<{ decision: string }>,
    pendingReviewCount: number,
    lookbackDays: number,
  ) {
    return {
      actionsExecuted: executions.length,
      proposalsReviewed: decisions.length,
      approvals: decisions.filter((decision) => decision.decision === 'APPROVED').length,
      rejections: decisions.filter((decision) => decision.decision === 'REJECTED').length,
      deferrals: decisions.filter((decision) => decision.decision === 'DEFERRED').length,
      pendingReviewCount,
      lookbackDays,
    };
  }

  private buildOutcomeSummary(
    outcomes: Array<{ outcomeType: ActionOutcomeType }>,
  ) {
    const positive = outcomes.filter((outcome) => outcome.outcomeType === ActionOutcomeType.POSITIVE).length;
    const neutral = outcomes.filter((outcome) => outcome.outcomeType === ActionOutcomeType.NEUTRAL).length;
    const negative = outcomes.filter((outcome) => outcome.outcomeType === ActionOutcomeType.NEGATIVE).length;
    const unknown = outcomes.filter((outcome) => outcome.outcomeType === ActionOutcomeType.UNKNOWN).length;
    const totalRecorded = outcomes.length;

    return {
      positive,
      neutral,
      negative,
      unknown,
      totalRecorded,
      positiveOutcomeRate: totalRecorded > 0 ? positive / totalRecorded : 0,
    };
  }

  private buildRecommendationEffectiveness(
    outcomes: Array<{
      outcomeType: ActionOutcomeType;
      execution: {
        status: string;
        proposal: { proposalType: string; metadata: Prisma.JsonValue | null } | null;
      } | null;
    }>,
    decisions: Array<{
      decision: string;
      proposal: { proposalType: string; metadata: Prisma.JsonValue | null } | null;
    }>,
    executions: Array<{
      status: string;
      proposal: { proposalType: string; metadata: Prisma.JsonValue | null } | null;
    }>,
  ) {
    const aggregates = new Map<
      string,
      {
        usageCount: number;
        positive: number;
        approvals: number;
        decisions: number;
        completed: number;
        finalizedExecutions: number;
      }
    >();

    for (const outcome of outcomes) {
      const type = this.extractRecommendationType(outcome.execution?.proposal);
      const current = aggregates.get(type) ?? {
        usageCount: 0,
        positive: 0,
        approvals: 0,
        decisions: 0,
        completed: 0,
        finalizedExecutions: 0,
      };
      current.usageCount += 1;
      if (outcome.outcomeType === ActionOutcomeType.POSITIVE) {
        current.positive += 1;
      }
      aggregates.set(type, current);
    }

    for (const decision of decisions) {
      const type = this.extractRecommendationType(decision.proposal);
      const current = aggregates.get(type) ?? {
        usageCount: 0,
        positive: 0,
        approvals: 0,
        decisions: 0,
        completed: 0,
        finalizedExecutions: 0,
      };
      current.decisions += 1;
      if (decision.decision === 'APPROVED') {
        current.approvals += 1;
      }
      aggregates.set(type, current);
    }

    for (const execution of executions) {
      const type = this.extractRecommendationType(execution.proposal);
      const current = aggregates.get(type) ?? {
        usageCount: 0,
        positive: 0,
        approvals: 0,
        decisions: 0,
        completed: 0,
        finalizedExecutions: 0,
      };
      if (['COMPLETED', 'FAILED', 'REJECTED'].includes(execution.status)) {
        current.finalizedExecutions += 1;
      }
      if (execution.status === 'COMPLETED') {
        current.completed += 1;
      }
      aggregates.set(type, current);
    }

    const items: OutcomeEffectivenessItem[] = [...aggregates.entries()]
      .map(([type, current]) => ({
        type,
        usageCount: current.usageCount,
        positiveOutcomeRate: current.usageCount > 0 ? current.positive / current.usageCount : 0,
        operatorApprovalRate: current.decisions > 0 ? current.approvals / current.decisions : 0,
        executionSuccessRate:
          current.finalizedExecutions > 0 ? current.completed / current.finalizedExecutions : 0,
      }))
      .filter((item) => item.usageCount > 0 || item.operatorApprovalRate > 0 || item.executionSuccessRate > 0);

    const topEffective = [...items]
      .sort((left, right) =>
        right.positiveOutcomeRate - left.positiveOutcomeRate ||
        right.operatorApprovalRate - left.operatorApprovalRate ||
        right.usageCount - left.usageCount ||
        left.type.localeCompare(right.type),
      )
      .slice(0, 3);

    const weaker = [...items]
      .sort((left, right) =>
        left.positiveOutcomeRate - right.positiveOutcomeRate ||
        left.executionSuccessRate - right.executionSuccessRate ||
        right.usageCount - left.usageCount ||
        left.type.localeCompare(right.type),
      )
      .slice(0, 3);

    return {
      topEffective,
      weaker,
    };
  }

  private buildProposalReviewPatterns(
    decisions: Array<{ decision: string; reason: string | null }>,
  ) {
    const total = decisions.length;
    const approvals = decisions.filter((decision) => decision.decision === 'APPROVED').length;
    const rejections = decisions.filter((decision) => decision.decision === 'REJECTED').length;
    const deferrals = decisions.filter((decision) => decision.decision === 'DEFERRED').length;
    const rejectionThemes = new Map<string, number>();

    for (const decision of decisions) {
      if (decision.decision !== 'REJECTED' || !decision.reason?.trim()) {
        continue;
      }
      const normalized = decision.reason.trim().toLowerCase().replace(/\s+/g, ' ');
      rejectionThemes.set(normalized, (rejectionThemes.get(normalized) ?? 0) + 1);
    }

    return {
      approvalRate: total > 0 ? approvals / total : 0,
      rejectionRate: total > 0 ? rejections / total : 0,
      deferRate: total > 0 ? deferrals / total : 0,
      repeatedRejectionThemes: [...rejectionThemes.entries()]
        .filter(([, count]) => count >= 2)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3)
        .map(([reason]) => this.toSentenceCase(reason)),
    };
  }

  private buildExecutionReliability(
    executions: Array<{ type: string; status: string }>,
  ) {
    const completed = executions.filter((execution) => execution.status === 'COMPLETED').length;
    const failed = executions.filter((execution) => execution.status === 'FAILED').length;
    const approvalPending = executions.filter((execution) => execution.status === 'PENDING_APPROVAL').length;
    const finalized = executions.filter((execution) => ['COMPLETED', 'FAILED'].includes(execution.status));
    const byType = new Map<string, { failedCount: number; total: number }>();

    for (const execution of finalized) {
      const current = byType.get(execution.type) ?? { failedCount: 0, total: 0 };
      current.total += 1;
      if (execution.status === 'FAILED') {
        current.failedCount += 1;
      }
      byType.set(execution.type, current);
    }

    return {
      completed,
      failed,
      approvalPending,
      successRate: finalized.length > 0 ? completed / finalized.length : 0,
      failureByType: [...byType.entries()]
        .map(([type, current]) => ({
          type,
          failedCount: current.failedCount,
          total: current.total,
        }))
        .sort((left, right) => right.failedCount - left.failedCount || right.total - left.total)
        .slice(0, 4),
    };
  }

  private buildLearningTrend(
    outcomes: Array<{ outcomeType: ActionOutcomeType; recordedAt: Date }>,
  ) {
    if (outcomes.length < 4) {
      return {
        status: 'insufficient_data' as const,
        summary: 'There is not enough recent activity to draw strong conclusions yet.',
        recentPositiveOutcomeRate: null,
        previousPositiveOutcomeRate: null,
      };
    }

    const sorted = [...outcomes].sort((left, right) => right.recordedAt.getTime() - left.recordedAt.getTime());
    const midpoint = Math.ceil(sorted.length / 2);
    const recent = sorted.slice(0, midpoint);
    const previous = sorted.slice(midpoint);
    const recentPositiveRate = this.countPositiveRate(recent);
    const previousPositiveRate = this.countPositiveRate(previous);
    const delta = recentPositiveRate - previousPositiveRate;

    if (delta >= 0.15) {
      return {
        status: 'improving' as const,
        summary: 'Recorded outcomes are improving versus the earlier portion of the lookback window.',
        recentPositiveOutcomeRate: recentPositiveRate,
        previousPositiveOutcomeRate: previousPositiveRate,
      };
    }

    if (delta <= -0.15) {
      return {
        status: 'weakening' as const,
        summary: 'Recorded outcomes are weakening versus the earlier portion of the lookback window.',
        recentPositiveOutcomeRate: recentPositiveRate,
        previousPositiveOutcomeRate: previousPositiveRate,
      };
    }

    return {
      status: 'stable' as const,
      summary: 'Recorded outcomes are stable across the current lookback window.',
      recentPositiveOutcomeRate: recentPositiveRate,
      previousPositiveOutcomeRate: previousPositiveRate,
    };
  }

  private buildLimitations(
    trust: CanonicalDataTrustStatus,
    actionsExecuted: number,
    totalOutcomes: number,
  ) {
    const limitations = [...trust.limitations];

    if (actionsExecuted === 0) {
      limitations.unshift('Outcome analytics will become available once Nexora actions and reviews accumulate.');
    } else if (totalOutcomes < 4) {
      limitations.unshift('There is not enough recent activity to draw strong conclusions yet.');
    }

    return this.compactList(limitations).slice(0, 4);
  }

  private buildRoiHighlights(input: {
    trust: CanonicalDataTrustStatus;
    actionVolume: OutcomeAnalyticsResponse['actionVolume'];
    outcomeSummary: OutcomeAnalyticsResponse['outcomeSummary'];
    recommendationEffectiveness: OutcomeAnalyticsResponse['recommendationEffectiveness'];
    proposalReviewPatterns: OutcomeAnalyticsResponse['proposalReviewPatterns'];
    executionReliability: OutcomeAnalyticsResponse['executionReliability'];
    learningTrend: OutcomeAnalyticsResponse['learningTrend'];
    limitations: string[];
  }) {
    const items = this.compactList([
      input.executionReliability.completed > 0 && input.executionReliability.successRate >= 0.7
        ? 'Most approved actions completed successfully in the current lookback window.'
        : null,
      input.recommendationEffectiveness.topEffective[0] &&
      input.recommendationEffectiveness.topEffective[0].usageCount >= 2
        ? `${this.humanizeType(input.recommendationEffectiveness.topEffective[0].type)} is showing the strongest positive outcomes so far.`
        : null,
      input.proposalReviewPatterns.approvalRate >= 0.7 && input.actionVolume.proposalsReviewed >= 4
        ? 'Operator approval rates are high, suggesting current proposal quality is credible.'
        : null,
      input.learningTrend.status === 'improving'
        ? 'Recent recorded outcomes are improving versus the earlier part of the lookback window.'
        : null,
      !input.trust.integrations.stripe.connected
        ? 'Payments-related visibility remains a limiting factor for full-value measurement.'
        : null,
      input.limitations[0] ?? null,
    ]);

    return items.slice(0, 5);
  }

  private buildSummary(input: {
    trust: CanonicalDataTrustStatus;
    actionVolume: OutcomeAnalyticsResponse['actionVolume'];
    outcomeSummary: OutcomeAnalyticsResponse['outcomeSummary'];
    learningTrend: OutcomeAnalyticsResponse['learningTrend'];
    roiHighlights: string[];
    limitations: string[];
  }) {
    if (input.actionVolume.actionsExecuted === 0) {
      return 'Outcome analytics will become available once Nexora actions and reviews accumulate.';
    }

    return this.joinSentences(
      input.outcomeSummary.totalRecorded > 0
        ? `${this.formatPercent(input.outcomeSummary.positiveOutcomeRate)} of recorded outcomes are positive across the current lookback window.`
        : 'Recorded outcome coverage is still limited.',
      input.learningTrend.summary,
      input.trust.overallStatus === 'healthy' ? null : input.trust.recommendedOperatorMessage,
      input.limitations[0],
    );
  }

  private extractRecommendationType(
    proposal:
      | {
          proposalType: string;
          metadata: Prisma.JsonValue | null;
        }
      | null
      | undefined,
  ) {
    if (!proposal) {
      return 'unmapped';
    }

    const metadata =
      proposal.metadata && typeof proposal.metadata === 'object' && !Array.isArray(proposal.metadata)
        ? (proposal.metadata as Record<string, unknown>)
        : null;

    if (typeof metadata?.recommendationType === 'string') {
      return metadata.recommendationType;
    }

    if (typeof metadata?.type === 'string') {
      return metadata.type;
    }

    return proposal.proposalType;
  }

  private countPositiveRate(outcomes: Array<{ outcomeType: ActionOutcomeType }>) {
    if (outcomes.length === 0) {
      return 0;
    }

    const positive = outcomes.filter((outcome) => outcome.outcomeType === ActionOutcomeType.POSITIVE).length;
    return positive / outcomes.length;
  }

  private compactList(values: Array<string | null | undefined>) {
    const deduped = new Set<string>();

    return values
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .filter((value) => {
        const normalized = value.toLowerCase();
        if (deduped.has(normalized)) {
          return false;
        }
        deduped.add(normalized);
        return true;
      });
  }

  private joinSentences(...values: Array<string | null | undefined>) {
    return this.compactList(values)
      .map((value) => value.replace(/[.!?]+$/g, '').trim())
      .map((value) => `${value}.`)
      .join(' ');
  }

  private humanizeType(value: string) {
    return value
      .split('_')
      .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
      .join(' ');
  }

  private toSentenceCase(value: string) {
    return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
  }

  private formatPercent(value: number) {
    return `${Math.round(value * 100)}%`;
  }

  private daysAgo(days: number) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
}
