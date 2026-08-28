import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActionOutcomeType,
  Prisma,
  StrategicPlanStatus,
  StrategicReviewWindow,
} from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { AiDataTrustService, CanonicalDataTrustStatus } from './ai-data-trust.service';
import { AiOutcomeAnalyticsService } from './ai-outcome-analytics.service';
import { AiScenarioPlanningService } from './ai-scenario-planning.service';
import { GenerateStrategicReviewDto } from './dto/generate-strategic-review.dto';
import { QueryStrategicReviewsDto } from './dto/query-strategic-reviews.dto';

type ProgressState = 'improving' | 'stable' | 'blocked' | 'weakening' | 'insufficient_data';

type ReviewEvidenceLink = {
  id: string;
  title: string;
  href: string;
  detail?: string | null;
  status?: string | null;
  type?: string | null;
};

type PriorityProgressItem = {
  priorityId: string;
  title: string;
  status: 'identified' | 'in_progress' | 'blocked' | 'completed';
  progressState: ProgressState;
  linkedEvidence: ReviewEvidenceLink[];
  nextStep: string;
};

type StrategicReviewSignalChange = {
  id: string;
  title: string;
  severity: string;
  changeType: 'new' | 'escalated' | 'resolved';
  summary: string;
  href: string;
};

type StrategicReviewActionReview = {
  proposalsApproved: number;
  proposalsRejected: number;
  proposalsDeferred: number;
  proposalsPending: number;
  executionsCompleted: number;
  executionsFailed: number;
  executionsPending: number;
  summary: string;
  openRisks: string[];
};

type StrategicReviewOutcomeReview = {
  positive: number;
  negative: number;
  neutral: number;
  unknown: number;
  positiveOutcomeRate: number;
  learningTrend: string;
  summary: string;
};

export type StrategicReviewReportView = {
  id: string;
  organizationId: string;
  reviewWindow: 'last_7_days' | 'current_week' | 'last_30_days';
  generatedAt: string;
  trust: CanonicalDataTrustStatus;
  summary: string;
  priorityProgress: PriorityProgressItem[];
  signalChanges: StrategicReviewSignalChange[];
  actionReview: StrategicReviewActionReview;
  outcomeReview: StrategicReviewOutcomeReview;
  scenarioNotes: string[];
  executiveFocus: string[];
  limitations: string[];
};

@Injectable()
export class AiStrategicReviewService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiDataTrustService: AiDataTrustService,
    private readonly aiOutcomeAnalyticsService: AiOutcomeAnalyticsService,
    private readonly aiScenarioPlanningService: AiScenarioPlanningService,
  ) {}

  async listStrategicReviews(principal: CurrentPrincipal, query: QueryStrategicReviewsDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const reviewWindow = query.reviewWindow ? this.toReviewWindow(query.reviewWindow) : undefined;

    const reports = await this.prismaService.strategicReviewReport.findMany({
      where: {
        organizationId,
        reviewWindow,
      },
      orderBy: [{ generatedAt: 'desc' }],
      take: query.limit ?? 8,
    });

    return buildSuccessResponse(
      'Strategic reviews retrieved successfully.',
      reports.map((report: Prisma.StrategicReviewReportGetPayload<{}>) => this.toReviewView(report)),
    );
  }

  async getStrategicReview(principal: CurrentPrincipal, id: string) {
    const report = await this.prismaService.strategicReviewReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Strategic review not found');
    }

    await this.aiCommerceMetricsService.resolveOrganizationScope(principal, report.organizationId);

    return buildSuccessResponse('Strategic review retrieved successfully.', this.toReviewView(report));
  }

  async generateStrategicReview(principal: CurrentPrincipal, dto: GenerateStrategicReviewDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );
    const reviewWindow = this.toReviewWindow(dto.reviewWindow);
    const plan = await this.prismaService.strategicPlan.findFirst({
      where: {
        organizationId,
        status: StrategicPlanStatus.ACTIVE,
      },
      include: {
        priorities: {
          orderBy: [{ urgency: 'desc' }, { updatedAt: 'desc' }],
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    if (!plan) {
      return buildSuccessResponse(
        'Strategic reviews become available once an active plan is in place.',
        null,
      );
    }

    const window = this.getWindowBounds(reviewWindow);
    const trust = await this.aiDataTrustService.getTrustForOrganization(organizationId);
    const outcomeAnalytics = await this.aiOutcomeAnalyticsService.getOutcomeAnalyticsPayload(
      principal,
      organizationId,
      this.windowLookbackDays(reviewWindow),
    );

    const [signalEvents, currentSignals, proposals, executions, outcomes] = await Promise.all([
      this.prismaService.aiSignal.findMany({
        where: {
          organizationId,
          OR: [{ createdAt: { gte: window.start } }, { detectedAt: { gte: window.start } }],
        },
        orderBy: [{ detectedAt: 'desc' }],
        take: 16,
      }),
      this.prismaService.aiSignal.findMany({
        where: { organizationId, isActive: true },
        orderBy: [{ detectedAt: 'desc' }],
        take: 24,
      }),
      this.prismaService.actionProposal.findMany({
        where: {
          organizationId,
          OR: [{ createdAt: { gte: window.start } }, { updatedAt: { gte: window.start } }],
        },
        orderBy: [{ updatedAt: 'desc' }],
        include: {
          reviews: {
            orderBy: { createdAt: 'desc' },
          },
          executions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prismaService.actionExecution.findMany({
        where: {
          organizationId,
          OR: [{ createdAt: { gte: window.start } }, { updatedAt: { gte: window.start } }],
        },
        orderBy: [{ updatedAt: 'desc' }],
        include: {
          proposal: true,
          outcome: true,
        },
      }),
      this.prismaService.actionOutcome.findMany({
        where: {
          organizationId,
          recordedAt: { gte: window.start },
        },
        orderBy: [{ recordedAt: 'desc' }],
        include: {
          execution: {
            include: {
              proposal: true,
            },
          },
        },
      }),
    ]);

    const signalChanges = this.buildSignalChanges(signalEvents, window.start);
    const actionReview = this.buildActionReview(proposals, executions);
    const outcomeReview = this.buildOutcomeReview(outcomes, outcomeAnalytics.learningTrend.status);
    const priorityProgress = this.buildPriorityProgress(plan.priorities, {
      trust,
      currentSignals,
      proposals,
      executions,
      outcomes,
    });
    const scenarioNotes = await this.buildScenarioNotes(principal, organizationId, plan.priorities);
    const limitations = this.buildLimitations({
      trust,
      plan,
      signalChanges,
      actionReview,
      outcomeReview,
    });
    const executiveFocus = this.buildExecutiveFocus({
      trust,
      priorityProgress,
      actionReview,
      signalChanges,
      outcomeReview,
    });
    const summary = this.buildSummary({
      trust,
      priorityProgress,
      signalChanges,
      actionReview,
      outcomeReview,
      limitations,
    });

    const record = await this.prismaService.strategicReviewReport.create({
      data: {
        organizationId,
        strategicPlanId: plan.id,
        reviewWindow,
        windowStart: window.start,
        windowEnd: window.end,
        summary,
        trustSnapshot: trust as unknown as Prisma.InputJsonValue,
        priorityProgress: priorityProgress as unknown as Prisma.InputJsonValue,
        signalChanges: signalChanges as unknown as Prisma.InputJsonValue,
        actionReview: actionReview as unknown as Prisma.InputJsonValue,
        outcomeReview: outcomeReview as unknown as Prisma.InputJsonValue,
        scenarioNotes: scenarioNotes as unknown as Prisma.InputJsonValue,
        executiveFocus: executiveFocus as unknown as Prisma.InputJsonValue,
        limitations: limitations as unknown as Prisma.InputJsonValue,
        metadata: {
          planId: plan.id,
          planTitle: plan.title,
          reviewWindow: this.fromReviewWindow(reviewWindow),
        } as Prisma.InputJsonValue,
      },
    });

    return buildSuccessResponse(
      'Strategic review generated successfully.',
      this.toReviewView(record),
    );
  }

  private buildPriorityProgress(
    priorities: Array<Prisma.StrategicPriorityGetPayload<{}>>,
    input: {
      trust: CanonicalDataTrustStatus;
      currentSignals: Array<Prisma.AiSignalGetPayload<{}>>;
      proposals: Array<Prisma.ActionProposalGetPayload<{ include: { reviews: true; executions: true } }>>;
      executions: Array<Prisma.ActionExecutionGetPayload<{ include: { proposal: true; outcome: true } }>>;
      outcomes: Array<Prisma.ActionOutcomeGetPayload<{ include: { execution: { include: { proposal: true } } } }>>;
    },
  ): PriorityProgressItem[] {
    return priorities.map((priority) => {
      const linkedSignals = this.parseArray(priority.linkedSignals);
      const linkedProposals = this.parseArray(priority.linkedProposals);
      const linkedExecutions = this.parseArray(priority.linkedExecutions);
      const linkedRecommendations = this.parseArray(priority.linkedRecommendations);

      const signalIds = new Set(linkedSignals.map((item) => this.stringValue(item.id)).filter(Boolean));
      const proposalIds = new Set(linkedProposals.map((item) => this.stringValue(item.id)).filter(Boolean));
      const executionIds = new Set(linkedExecutions.map((item) => this.stringValue(item.id)).filter(Boolean));

      const matchedSignals = input.currentSignals.filter((item) => signalIds.has(item.id));
      const matchedProposals = input.proposals.filter((item) => proposalIds.has(item.id));
      const matchedExecutions = input.executions.filter(
        (item) => executionIds.has(item.id) || (item.proposalId ? proposalIds.has(item.proposalId) : false),
      );
      const matchedOutcomes = input.outcomes.filter(
        (item) => executionIds.has(item.executionId) || (item.proposalId ? proposalIds.has(item.proposalId) : false),
      );

      const highSignalCount = matchedSignals.filter((item) =>
        ['high', 'critical'].includes(item.severity.toLowerCase()),
      ).length;
      const failedExecutions = matchedExecutions.filter((item) => item.status === 'FAILED').length;
      const completedExecutions = matchedExecutions.filter((item) =>
        ['COMPLETED', 'SUCCEEDED'].includes(item.status),
      ).length;
      const positiveOutcomes = matchedOutcomes.filter((item) => item.outcomeType === ActionOutcomeType.POSITIVE).length;
      const negativeOutcomes = matchedOutcomes.filter((item) => item.outcomeType === ActionOutcomeType.NEGATIVE).length;
      const pendingProposals = matchedProposals.filter((item) =>
        ['PENDING', 'IN_REVIEW', 'NEEDS_REVISION', 'DEFERRED'].includes(item.status),
      ).length;

      const evidenceCount =
        matchedSignals.length + matchedProposals.length + matchedExecutions.length + matchedOutcomes.length;

      let progressState: ProgressState = 'stable';
      if (evidenceCount === 0 && linkedRecommendations.length === 0) {
        progressState = 'insufficient_data';
      } else if (priority.status === 'BLOCKED' || failedExecutions > 0 || (highSignalCount > 0 && completedExecutions === 0)) {
        progressState = 'blocked';
      } else if (negativeOutcomes > positiveOutcomes || (highSignalCount > 0 && pendingProposals > 0)) {
        progressState = 'weakening';
      } else if (completedExecutions > 0 || positiveOutcomes > 0 || (matchedSignals.length === 0 && pendingProposals === 0)) {
        progressState = 'improving';
      }

      const linkedEvidence = this.compactList<ReviewEvidenceLink>([
        ...matchedSignals.slice(0, 2).map((item) => ({
          id: item.id,
          title: item.title,
          href: '/shopify/signals',
          detail: item.description,
          status: item.severity,
          type: 'signal',
        })),
        ...matchedProposals.slice(0, 1).map((item) => ({
          id: item.id,
          title: item.title,
          href: '/shopify/action-proposals',
          detail: item.latestDecisionNote ?? item.description,
          status: item.status,
          type: 'proposal',
        })),
        ...matchedExecutions.slice(0, 1).map((item) => ({
          id: item.id,
          title: item.type.replaceAll('_', ' ').toLowerCase(),
          href: '/shopify/action-proposals',
          detail: item.error ?? null,
          status: item.status,
          type: 'execution',
        })),
        matchedOutcomes[0]
          ? {
              id: matchedOutcomes[0].id,
              title: 'Recorded outcome',
              href: '/shopify/outcomes',
              detail: matchedOutcomes[0].notes ?? null,
              status: matchedOutcomes[0].outcomeType,
              type: 'outcome',
            }
          : null,
      ]).slice(0, 4);

      return {
        priorityId: priority.id,
        title: priority.title,
        status: this.fromPriorityStatus(priority.status),
        progressState,
        linkedEvidence,
        nextStep: this.buildPriorityNextStep({
          title: priority.title,
          progressState,
          pendingProposals,
          failedExecutions,
          trust: input.trust,
        }),
      };
    });
  }

  private buildSignalChanges(
    signals: Array<Prisma.AiSignalGetPayload<{}>>,
    windowStart: Date,
  ): StrategicReviewSignalChange[] {
    return signals
      .map((signal) => ({
        id: signal.id,
        title: signal.title,
        severity: signal.severity,
        changeType: (
          !signal.isActive
            ? 'resolved'
            : signal.createdAt.getTime() === signal.detectedAt.getTime() || signal.createdAt >= windowStart
              ? 'new'
              : 'escalated'
        ) as StrategicReviewSignalChange['changeType'],
        summary: signal.description,
        href: '/shopify/signals',
      }))
      .sort((left, right) => this.signalChangeRank(left) - this.signalChangeRank(right))
      .slice(0, 5);
  }

  private buildActionReview(
    proposals: Array<Prisma.ActionProposalGetPayload<{ include: { reviews: true; executions: true } }>>,
    executions: Array<Prisma.ActionExecutionGetPayload<{ include: { proposal: true; outcome: true } }>>,
  ): StrategicReviewActionReview {
    const proposalsApproved = proposals.filter((item) => item.status === 'APPROVED').length;
    const proposalsRejected = proposals.filter((item) => item.status === 'REJECTED').length;
    const proposalsDeferred = proposals.filter((item) => item.status === 'DEFERRED').length;
    const proposalsPending = proposals.filter((item) =>
      ['PENDING', 'IN_REVIEW', 'NEEDS_REVISION', 'DEFERRED'].includes(item.status),
    ).length;
    const executionsCompleted = executions.filter((item) =>
      ['COMPLETED', 'SUCCEEDED'].includes(item.status),
    ).length;
    const executionsFailed = executions.filter((item) => item.status === 'FAILED').length;
    const executionsPending = executions.filter((item) =>
      ['PENDING', 'PENDING_APPROVAL', 'APPROVED', 'EXECUTING', 'BLOCKED'].includes(item.status),
    ).length;

    const openRisks = this.compactList([
      proposalsPending > 0 ? `${proposalsPending} proposal${proposalsPending === 1 ? '' : 's'} still need review.` : null,
      executionsFailed > 0 ? `${executionsFailed} execution${executionsFailed === 1 ? '' : 's'} failed and need follow-up.` : null,
      executionsPending > 0 ? `${executionsPending} execution${executionsPending === 1 ? '' : 's'} remain in progress or awaiting review.` : null,
    ]);

    return {
      proposalsApproved,
      proposalsRejected,
      proposalsDeferred,
      proposalsPending,
      executionsCompleted,
      executionsFailed,
      executionsPending,
      summary: this.compactSentences([
        proposalsApproved > 0
          ? `${proposalsApproved} proposal${proposalsApproved === 1 ? '' : 's'} advanced this review window.`
          : null,
        executionsFailed > 0
          ? `${executionsFailed} execution${executionsFailed === 1 ? '' : 's'} failed and remain open.`
          : executionsCompleted > 0
            ? `${executionsCompleted} execution${executionsCompleted === 1 ? '' : 's'} completed successfully.`
            : null,
        proposalsPending === 0 && executionsPending === 0
          ? 'No major governance backlog is open right now.'
          : null,
      ]),
      openRisks,
    };
  }

  private buildOutcomeReview(
    outcomes: Array<Prisma.ActionOutcomeGetPayload<{ include: { execution: { include: { proposal: true } } } }>>,
    learningTrend: string,
  ): StrategicReviewOutcomeReview {
    const positive = outcomes.filter((item) => item.outcomeType === ActionOutcomeType.POSITIVE).length;
    const negative = outcomes.filter((item) => item.outcomeType === ActionOutcomeType.NEGATIVE).length;
    const neutral = outcomes.filter((item) => item.outcomeType === ActionOutcomeType.NEUTRAL).length;
    const unknown = outcomes.filter((item) => item.outcomeType === ActionOutcomeType.UNKNOWN).length;
    const total = outcomes.length;
    const positiveOutcomeRate = total > 0 ? positive / total : 0;

    return {
      positive,
      negative,
      neutral,
      unknown,
      positiveOutcomeRate,
      learningTrend,
      summary: total === 0
        ? 'There is not enough recent activity to draw strong conclusions yet.'
        : this.compactSentences([
            `${positive} positive and ${negative} negative outcome${positive + negative === 1 ? '' : 's'} were recorded in this review window.`,
            learningTrend === 'improving'
              ? 'Measured effectiveness is improving.'
              : learningTrend === 'weakening'
                ? 'Measured effectiveness weakened in this review window.'
                : learningTrend === 'insufficient_data'
                  ? 'Recent learning volume is still light.'
                  : 'Effectiveness remained broadly stable.',
          ]),
    };
  }

  private async buildScenarioNotes(
    principal: CurrentPrincipal,
    organizationId: string,
    priorities: Array<Prisma.StrategicPriorityGetPayload<{}>>,
  ): Promise<string[]> {
    const scenarioTypes = Array.from(
      new Set(
        priorities
          .flatMap((priority) => this.parseArray(priority.linkedScenarios))
          .map((item) => this.stringValue(item.scenarioType))
          .filter((item): item is string => Boolean(item)),
      ),
    ).slice(0, 3);

    if (scenarioTypes.length === 0) {
      return [];
    }

    const responses = await Promise.all(
      scenarioTypes.map(async (scenarioType) => {
        const response = await this.aiScenarioPlanningService.analyze(principal, {
          organizationId,
          scenarioType,
        });
        return response.data as { summary?: string };
      }),
    );

    return this.compactList(
      responses.map((item) => (typeof item.summary === 'string' ? item.summary : null)),
    ).slice(0, 3);
  }

  private buildExecutiveFocus(input: {
    trust: CanonicalDataTrustStatus;
    priorityProgress: PriorityProgressItem[];
    actionReview: StrategicReviewActionReview;
    signalChanges: StrategicReviewSignalChange[];
    outcomeReview: StrategicReviewOutcomeReview;
  }) {
    const blockedPriority = input.priorityProgress.find((item) =>
      ['blocked', 'weakening'].includes(item.progressState),
    );
    const unresolvedSignal = input.signalChanges.find((item) => item.changeType !== 'resolved');

    return this.compactList([
      blockedPriority ? `Review ${blockedPriority.title.toLowerCase()} because progress is ${blockedPriority.progressState}.` : null,
      input.actionReview.proposalsPending > 0
        ? 'Prioritize review of pending proposals so open risks do not drift into the next cycle.'
        : null,
      input.actionReview.executionsFailed > 0
        ? 'Resolve failed executions before assuming current mitigations are working.'
        : null,
      input.trust.overallStatus !== 'healthy'
        ? input.trust.recommendedOperatorMessage
        : null,
      unresolvedSignal ? `Track whether ${unresolvedSignal.title.toLowerCase()} remains active next week.` : null,
      input.outcomeReview.learningTrend === 'weakening'
        ? 'Review whether recent actions are still producing useful outcomes.'
        : null,
    ]).slice(0, 5);
  }

  private buildSummary(input: {
    trust: CanonicalDataTrustStatus;
    priorityProgress: PriorityProgressItem[];
    signalChanges: StrategicReviewSignalChange[];
    actionReview: StrategicReviewActionReview;
    outcomeReview: StrategicReviewOutcomeReview;
    limitations: string[];
  }) {
    const improvingCount = input.priorityProgress.filter((item) => item.progressState === 'improving').length;
    const blocked = input.priorityProgress.find((item) =>
      ['blocked', 'weakening'].includes(item.progressState),
    );
    const leadingSignal = input.signalChanges[0] ?? null;

    return this.compactSentences([
      improvingCount > 0
        ? `${improvingCount} strategic priorit${improvingCount === 1 ? 'y progressed' : 'ies progressed'} in this review window.`
        : 'Strategic progress remained limited in this review window.',
      leadingSignal
        ? `${leadingSignal.title} was the most important ${leadingSignal.changeType} signal this period.`
        : null,
      blocked ? `${blocked.title} remains the clearest stalled priority.` : null,
      input.actionReview.executionsFailed > 0
        ? 'Execution reliability still needs leadership attention.'
        : input.outcomeReview.learningTrend === 'improving'
          ? 'Measured action effectiveness improved during the window.'
          : null,
      input.trust.overallStatus === 'healthy'
        ? null
        : input.trust.recommendedOperatorMessage,
      input.limitations[0] ?? null,
    ]);
  }

  private buildLimitations(input: {
    trust: CanonicalDataTrustStatus;
    plan: Prisma.StrategicPlanGetPayload<{ include: { priorities: true } }>;
    signalChanges: StrategicReviewSignalChange[];
    actionReview: StrategicReviewActionReview;
    outcomeReview: StrategicReviewOutcomeReview;
  }) {
    const limitations = [...input.trust.limitations];

    if (input.plan.priorities.length === 0) {
      limitations.push('There are no active strategic priorities linked to this review yet.');
    }

    if (
      input.signalChanges.length === 0 &&
      input.actionReview.executionsCompleted === 0 &&
      input.actionReview.executionsFailed === 0 &&
      input.outcomeReview.positive + input.outcomeReview.negative + input.outcomeReview.neutral === 0
    ) {
      limitations.push('There is not enough recent activity to generate a strong strategic review yet.');
    }

    return Array.from(new Set(limitations)).slice(0, 4);
  }

  private toReviewView(
    report: Prisma.StrategicReviewReportGetPayload<{}>,
  ): StrategicReviewReportView {
    return {
      id: report.id,
      organizationId: report.organizationId,
      reviewWindow: this.fromReviewWindow(report.reviewWindow),
      generatedAt: report.generatedAt.toISOString(),
      trust: this.parseObject(report.trustSnapshot) as CanonicalDataTrustStatus,
      summary: report.summary ?? 'Strategic review generated.',
      priorityProgress: this.parseArray(report.priorityProgress) as PriorityProgressItem[],
      signalChanges: this.parseArray(report.signalChanges) as StrategicReviewSignalChange[],
      actionReview: this.parseObject(report.actionReview) as StrategicReviewActionReview,
      outcomeReview: this.parseObject(report.outcomeReview) as StrategicReviewOutcomeReview,
      scenarioNotes: this.parseStringArray(report.scenarioNotes),
      executiveFocus: this.parseStringArray(report.executiveFocus),
      limitations: this.parseStringArray(report.limitations),
    };
  }

  private buildPriorityNextStep(input: {
    title: string;
    progressState: ProgressState;
    pendingProposals: number;
    failedExecutions: number;
    trust: CanonicalDataTrustStatus;
  }) {
    if (input.failedExecutions > 0) {
      return 'Review failed executions and clear the recovery path before the next cycle.';
    }
    if (input.pendingProposals > 0) {
      return 'Review the pending proposal linked to this priority.';
    }
    if (input.progressState === 'blocked' || input.progressState === 'weakening') {
      return `Escalate ${input.title.toLowerCase()} in the next leadership review.`;
    }
    if (input.trust.overallStatus !== 'healthy') {
      return input.trust.recommendedOperatorMessage;
    }
    if (input.progressState === 'insufficient_data') {
      return 'Continue tracking activity before drawing a stronger planning conclusion.';
    }
    return 'Carry this priority into the next review cycle and confirm progress remains real.';
  }

  private signalChangeRank(item: StrategicReviewSignalChange) {
    const changeRank = item.changeType === 'escalated' ? 0 : item.changeType === 'new' ? 1 : 2;
    const severityRank = this.severityRank(item.severity);
    return changeRank * 10 + severityRank;
  }

  private severityRank(value: string) {
    switch (value.toLowerCase()) {
      case 'critical':
        return 0;
      case 'high':
        return 1;
      case 'medium':
        return 2;
      default:
        return 3;
    }
  }

  private getWindowBounds(reviewWindow: StrategicReviewWindow) {
    const now = new Date();
    switch (reviewWindow) {
      case StrategicReviewWindow.LAST_7_DAYS:
        return {
          start: this.daysAgo(7),
          end: now,
        };
      case StrategicReviewWindow.LAST_30_DAYS:
        return {
          start: this.daysAgo(30),
          end: now,
        };
      case StrategicReviewWindow.CURRENT_WEEK:
      default: {
        const start = new Date(now);
        const day = start.getDay();
        const diff = (day + 6) % 7;
        start.setDate(start.getDate() - diff);
        start.setHours(0, 0, 0, 0);
        return {
          start,
          end: now,
        };
      }
    }
  }

  private windowLookbackDays(reviewWindow: StrategicReviewWindow) {
    switch (reviewWindow) {
      case StrategicReviewWindow.LAST_30_DAYS:
        return 30;
      case StrategicReviewWindow.CURRENT_WEEK:
      case StrategicReviewWindow.LAST_7_DAYS:
      default:
        return 7;
    }
  }

  private toReviewWindow(value?: 'last_7_days' | 'current_week' | 'last_30_days') {
    switch (value) {
      case 'last_30_days':
        return StrategicReviewWindow.LAST_30_DAYS;
      case 'last_7_days':
        return StrategicReviewWindow.LAST_7_DAYS;
      case 'current_week':
      default:
        return StrategicReviewWindow.CURRENT_WEEK;
    }
  }

  private fromReviewWindow(value: StrategicReviewWindow): StrategicReviewReportView['reviewWindow'] {
    switch (value) {
      case StrategicReviewWindow.LAST_7_DAYS:
        return 'last_7_days';
      case StrategicReviewWindow.LAST_30_DAYS:
        return 'last_30_days';
      case StrategicReviewWindow.CURRENT_WEEK:
      default:
        return 'current_week';
    }
  }

  private fromPriorityStatus(value: string): PriorityProgressItem['status'] {
    switch (value) {
      case 'IN_PROGRESS':
        return 'in_progress';
      case 'BLOCKED':
        return 'blocked';
      case 'COMPLETED':
        return 'completed';
      case 'IDENTIFIED':
      default:
        return 'identified';
    }
  }

  private parseArray(value: Prisma.JsonValue | null | undefined): Array<Record<string, unknown>> {
    const items = Array.isArray(value) ? value : [];
    return items.filter((item) => !!item && typeof item === 'object' && !Array.isArray(item)) as Array<
      Record<string, unknown>
    >;
  }

  private parseObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private parseStringArray(value: Prisma.JsonValue | null | undefined) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' ? value : '';
  }

  private compactList<T>(items: Array<T | null | undefined>) {
    return items.filter((item): item is T => item !== null && item !== undefined);
  }

  private compactSentences(items: Array<string | null | undefined>) {
    return this.compactList(items)
      .map((item) => item.trim())
      .filter(Boolean)
      .join(' ');
  }

  private daysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
