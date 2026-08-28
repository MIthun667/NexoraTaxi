import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  StrategicPlanStatus,
  StrategicPlanningWindow,
  StrategicPriorityCategory,
  StrategicPriorityStatus,
  StrategicPriorityUrgency,
} from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AiActionProposalEngineService } from './ai-action-proposal-engine.service';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { AiDataTrustService, CanonicalDataTrustStatus } from './ai-data-trust.service';
import { AiExecutiveCopilotService } from './ai-executive-copilot.service';
import { AiExecutionService } from './ai-execution.service';
import { AiOutcomeAnalyticsService } from './ai-outcome-analytics.service';
import { AiRecommendationService } from './ai-recommendation.service';
import { AiSignalService } from './ai-signal.service';
import { CreateStrategicPlanDto } from './dto/create-strategic-plan.dto';
import { CreateStrategicPriorityDto } from './dto/create-strategic-priority.dto';
import { QueryStrategicPlanDto } from './dto/query-strategic-plan.dto';
import { UpdateStrategicPlanDto } from './dto/update-strategic-plan.dto';
import { UpdateStrategicPriorityDto } from './dto/update-strategic-priority.dto';

type StrategicArtifactLink = {
  id: string;
  title: string;
  href: string;
  detail?: string | null;
  status?: string | null;
  type?: string | null;
};

type StrategicScenarioLink = {
  id: string;
  title: string;
  scenarioType: string;
  detail?: string | null;
};

type StrategicOutcomeSummary = {
  summary: string;
  trend: string;
  positiveOutcomeRate: number;
};

export type StrategicPriorityView = {
  id: string;
  strategicPlanId: string;
  title: string;
  description: string;
  category: 'revenue' | 'customers' | 'integrations' | 'operations' | 'trust' | 'payments' | 'catalog';
  status: 'identified' | 'in_progress' | 'blocked' | 'completed';
  urgency: 'low' | 'medium' | 'high';
  linkedSignals: StrategicArtifactLink[];
  linkedRecommendations: StrategicArtifactLink[];
  linkedProposals: StrategicArtifactLink[];
  linkedScenarios: StrategicScenarioLink[];
  linkedExecutions: StrategicArtifactLink[];
  linkedAgentRuns: StrategicArtifactLink[];
  linkedOutcomeSummary: StrategicOutcomeSummary | null;
  successCriteria: string[];
  owner: string | null;
  targetDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StrategicPlanView = {
  id: string;
  organizationId: string;
  title: string;
  planningWindow: 'current_cycle' | 'next_30_days' | 'next_quarter';
  status: 'draft' | 'active' | 'archived';
  summary: string;
  priorities: StrategicPriorityView[];
  createdAt: string;
  updatedAt: string;
};

export type StrategicPriorityCandidate = {
  candidateKey: string;
  title: string;
  description: string;
  category: StrategicPriorityView['category'];
  urgency: StrategicPriorityView['urgency'];
  rationale: string;
  linkedSignals: StrategicArtifactLink[];
  linkedRecommendations: StrategicArtifactLink[];
  linkedProposals: StrategicArtifactLink[];
  linkedScenarios: StrategicScenarioLink[];
  linkedExecutions: StrategicArtifactLink[];
  linkedAgentRuns: StrategicArtifactLink[];
  linkedOutcomeSummary: StrategicOutcomeSummary | null;
  successCriteria: string[];
};

export type StrategicPlanningWorkspaceResponse = {
  organizationId: string;
  generatedAt: string;
  trust: CanonicalDataTrustStatus;
  plan: StrategicPlanView | null;
  candidatePriorities: StrategicPriorityCandidate[];
  limitations: string[];
};

@Injectable()
export class AiStrategicPlanningService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiDataTrustService: AiDataTrustService,
    private readonly aiExecutiveCopilotService: AiExecutiveCopilotService,
    private readonly aiOutcomeAnalyticsService: AiOutcomeAnalyticsService,
    private readonly aiSignalService: AiSignalService,
    private readonly aiRecommendationService: AiRecommendationService,
    private readonly aiActionProposalEngineService: AiActionProposalEngineService,
    private readonly aiExecutionService: AiExecutionService,
  ) {}

  async getStrategicPlan(principal: CurrentPrincipal, query: QueryStrategicPlanDto) {
    const payload = await this.getWorkspacePayload(principal, query);
    return buildSuccessResponse('Strategic planning workspace retrieved successfully.', payload);
  }

  async createStrategicPlan(principal: CurrentPrincipal, dto: CreateStrategicPlanDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );
    const planningWindow = this.toPlanningWindow(dto.planningWindow);

    const existing = await this.prismaService.strategicPlan.findFirst({
      where: {
        organizationId,
        planningWindow,
        status: { in: [StrategicPlanStatus.DRAFT, StrategicPlanStatus.ACTIVE] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      await this.prismaService.strategicPlan.update({
        where: { id: existing.id },
        data: {
          title: dto.title ?? existing.title,
          status: dto.status ? this.toPlanStatus(dto.status) : existing.status,
        },
      });
    } else {
      const candidates = await this.generateCandidatePriorities(principal, organizationId);
      await this.prismaService.strategicPlan.create({
        data: {
          organizationId,
          createdByUserId: principal.userId,
          title: dto.title ?? this.defaultPlanTitle(planningWindow),
          planningWindow,
          status: dto.status ? this.toPlanStatus(dto.status) : StrategicPlanStatus.ACTIVE,
          summary: this.buildPlanSummary([], candidates),
        },
      });
    }

    return buildSuccessResponse(
      'Strategic plan created successfully.',
      await this.getWorkspacePayload(principal, {
        organizationId,
        planningWindow: this.fromPlanningWindow(planningWindow),
      }),
    );
  }

  async updateStrategicPlan(
    principal: CurrentPrincipal,
    planId: string,
    dto: UpdateStrategicPlanDto,
  ) {
    const plan = await this.requirePlanInScope(principal, planId);

    const updated = await this.prismaService.strategicPlan.update({
      where: { id: plan.id },
      data: {
        title: dto.title ?? undefined,
        planningWindow: dto.planningWindow ? this.toPlanningWindow(dto.planningWindow) : undefined,
        status: dto.status ? this.toPlanStatus(dto.status) : undefined,
      },
    });

    await this.refreshPlanSummary(plan.id);

    return buildSuccessResponse(
      'Strategic plan updated successfully.',
      await this.getWorkspacePayload(principal, {
        organizationId: updated.organizationId,
        planningWindow: this.fromPlanningWindow(updated.planningWindow),
      }),
    );
  }

  async generateCandidates(principal: CurrentPrincipal, planId: string) {
    const plan = await this.requirePlanInScope(principal, planId);
    const candidates = await this.generateCandidatePriorities(principal, plan.organizationId);
    return buildSuccessResponse('Candidate strategic priorities generated successfully.', candidates);
  }

  async createPriority(
    principal: CurrentPrincipal,
    planId: string,
    dto: CreateStrategicPriorityDto,
  ) {
    const plan = await this.requirePlanInScope(principal, planId);

    const created = await this.prismaService.strategicPriority.create({
      data: {
        strategicPlanId: plan.id,
        title: dto.title,
        description: dto.description,
        category: this.toPriorityCategory(dto.category),
        status: dto.status ? this.toPriorityStatus(dto.status) : StrategicPriorityStatus.IDENTIFIED,
        urgency: dto.urgency ? this.toPriorityUrgency(dto.urgency) : StrategicPriorityUrgency.MEDIUM,
        linkedSignals: this.toJsonArray(dto.linkedSignals),
        linkedRecommendations: this.toJsonArray(dto.linkedRecommendations),
        linkedProposals: this.toJsonArray(dto.linkedProposals),
        linkedScenarios: this.toJsonArray(dto.linkedScenarios),
        linkedExecutions: this.toJsonArray(dto.linkedExecutions),
        linkedAgentRuns: this.toJsonArray(dto.linkedAgentRuns),
        linkedOutcomeSummary: this.toJsonObject(dto.linkedOutcomeSummary),
        successCriteria: this.toJsonArray(dto.successCriteria),
        owner: dto.owner ?? null,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        notes: dto.notes ?? null,
      },
    });

    await this.refreshPlanSummary(plan.id);

    return buildSuccessResponse(
      'Strategic priority created successfully.',
      await this.getPriorityView(created.id),
    );
  }

  async updatePriority(
    principal: CurrentPrincipal,
    planId: string,
    priorityId: string,
    dto: UpdateStrategicPriorityDto,
  ) {
    const plan = await this.requirePlanInScope(principal, planId);
    await this.requirePriorityInPlan(plan.id, priorityId);

    const updated = await this.prismaService.strategicPriority.update({
      where: { id: priorityId },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        category: dto.category ? this.toPriorityCategory(dto.category) : undefined,
        status: dto.status ? this.toPriorityStatus(dto.status) : undefined,
        urgency: dto.urgency ? this.toPriorityUrgency(dto.urgency) : undefined,
        linkedSignals: dto.linkedSignals !== undefined ? this.toJsonArray(dto.linkedSignals) : undefined,
        linkedRecommendations:
          dto.linkedRecommendations !== undefined ? this.toJsonArray(dto.linkedRecommendations) : undefined,
        linkedProposals: dto.linkedProposals !== undefined ? this.toJsonArray(dto.linkedProposals) : undefined,
        linkedScenarios: dto.linkedScenarios !== undefined ? this.toJsonArray(dto.linkedScenarios) : undefined,
        linkedExecutions: dto.linkedExecutions !== undefined ? this.toJsonArray(dto.linkedExecutions) : undefined,
        linkedAgentRuns: dto.linkedAgentRuns !== undefined ? this.toJsonArray(dto.linkedAgentRuns) : undefined,
        linkedOutcomeSummary:
          dto.linkedOutcomeSummary !== undefined ? this.toJsonObject(dto.linkedOutcomeSummary) : undefined,
        successCriteria: dto.successCriteria !== undefined ? this.toJsonArray(dto.successCriteria) : undefined,
        owner: dto.owner !== undefined ? dto.owner : undefined,
        targetDate: dto.targetDate !== undefined ? (dto.targetDate ? new Date(dto.targetDate) : null) : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
      },
    });

    await this.refreshPlanSummary(plan.id);

    return buildSuccessResponse(
      'Strategic priority updated successfully.',
      await this.getPriorityView(updated.id),
    );
  }

  private async getWorkspacePayload(
    principal: CurrentPrincipal,
    query: QueryStrategicPlanDto,
  ): Promise<StrategicPlanningWorkspaceResponse> {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const planningWindow = query.planningWindow ? this.toPlanningWindow(query.planningWindow) : null;

    const [trust, plan, candidates] = await Promise.all([
      this.aiDataTrustService.getTrustForOrganization(organizationId),
      this.findPlan(organizationId, planningWindow),
      this.generateCandidatePriorities(principal, organizationId),
    ]);

    return {
      organizationId,
      generatedAt: new Date().toISOString(),
      trust,
      plan: plan ? this.toPlanView(plan) : null,
      candidatePriorities: candidates,
      limitations: this.buildWorkspaceLimitations(trust, candidates),
    };
  }

  private async generateCandidatePriorities(
    principal: CurrentPrincipal,
    organizationId: string,
  ): Promise<StrategicPriorityCandidate[]> {
    const [trust, executive, outcomes, signals, recommendations, proposals, executionsResponse, agentRuns] =
      await Promise.all([
        this.aiDataTrustService.getTrustForOrganization(organizationId),
        this.aiExecutiveCopilotService.getExecutiveCopilotPayload(principal, organizationId, false),
        this.aiOutcomeAnalyticsService.getOutcomeAnalyticsPayload(principal, organizationId, 30),
        this.aiSignalService.getCanonicalSignals(principal, { organizationId }, { forceRefresh: false }),
        this.aiRecommendationService.getCanonicalRecommendations(
          principal,
          { organizationId },
          { forceRefresh: false },
        ),
        this.aiActionProposalEngineService.ensureCurrentProposals(principal, organizationId, false),
        this.aiExecutionService.listExecutions(principal, { organizationId }),
        this.prismaService.agentRun.findMany({
          where: { organizationId },
          orderBy: { startedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            summary: true,
            status: true,
            agentDefinition: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        }),
      ]);

    const executions = (executionsResponse.data as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id),
      type: String(item.type),
      status: String(item.status),
    }));

    const revenueSignals = signals.filter((item) => ['revenue_drop', 'order_slowdown'].includes(item.type));
    const customerSignals = signals.filter((item) => item.type === 'customer_slowdown');
    const trustSignals = signals.filter((item) => ['sync_issue', 'data_coverage_limit'].includes(item.type));
    const paymentSignals = signals.filter((item) => item.type === 'payment_visibility_gap');
    const demandSignals = signals.filter((item) =>
      ['demand_spike', 'product_concentration_risk'].includes(item.type),
    );

    const candidates: StrategicPriorityCandidate[] = [];

    if (revenueSignals.length > 0 || recommendations.some((item) => item.type === 'monitor_revenue_decline')) {
      candidates.push({
        candidateKey: 'revenue-stabilization',
        title: 'Stabilize revenue performance',
        description:
          'Formalize a revenue stabilization priority so leadership reviews the current decline drivers before making reactive commercial changes.',
        category: 'revenue',
        urgency: this.maxUrgencyFromSignals(revenueSignals, 'high'),
        rationale:
          revenueSignals[0]?.summary ??
          executive.topSummary.whatMatters,
        linkedSignals: revenueSignals.slice(0, 3).map((item) => this.signalLink(item.id, item.title, item.summary)),
        linkedRecommendations: recommendations
          .filter((item) => item.type === 'monitor_revenue_decline')
          .slice(0, 2)
          .map((item) => this.recommendationLink(item.id, item.title, item.summary)),
        linkedProposals: proposals
          .filter((item) => item.proposalType === 'investigate_metric_drop')
          .slice(0, 2)
          .map((item) => this.proposalLink(item.id, item.title, item.status)),
        linkedScenarios: [
          this.scenarioLink('revenue_slowdown_persists', 'Revenue slowdown persists'),
          this.scenarioLink('no_action_taken', 'No action taken'),
        ],
        linkedExecutions: executions
          .filter((item) => item.type === 'TRIGGER_DATA_REFRESH')
          .slice(0, 1)
          .map((item) => this.executionLink(item.id, item.type, item.status)),
        linkedAgentRuns: agentRuns
          .filter((item) => item.agentDefinition.code === 'revenue_monitor_agent')
          .slice(0, 1)
          .map((item) => this.agentRunLink(item.id, item.agentDefinition.name, item.summary)),
        linkedOutcomeSummary: this.outcomeSummaryLink(outcomes),
        successCriteria: [
          'Revenue-related high-severity signals are reduced.',
          'Leadership has reviewed the current revenue decline drivers.',
          'Open revenue-related proposals are either reviewed or resolved.',
        ],
      });
    }

    if (
      trust.overallStatus !== 'healthy' ||
      trustSignals.length > 0 ||
      recommendations.some((item) => ['review_sync_health', 'improve_visibility'].includes(item.type))
    ) {
      candidates.push({
        candidateKey: 'trust-restoration',
        title: 'Restore decision-quality trust',
        description:
          'Create a formal trust priority so leadership restores current data quality before leaning on new performance comparisons.',
        category: 'trust',
        urgency: trust.overallStatus === 'issue_detected' ? 'high' : 'medium',
        rationale: trust.recommendedOperatorMessage,
        linkedSignals: trustSignals.slice(0, 3).map((item) => this.signalLink(item.id, item.title, item.summary)),
        linkedRecommendations: recommendations
          .filter((item) => ['review_sync_health', 'improve_visibility'].includes(item.type))
          .slice(0, 2)
          .map((item) => this.recommendationLink(item.id, item.title, item.summary)),
        linkedProposals: proposals
          .filter((item) => ['review_store_sync_issue', 'review_visibility_gap'].includes(item.proposalType))
          .slice(0, 2)
          .map((item) => this.proposalLink(item.id, item.title, item.status)),
        linkedScenarios: [
          this.scenarioLink('sync_issue_persists', 'Sync issue persists'),
          this.scenarioLink('no_action_taken', 'No action taken'),
        ],
        linkedExecutions: executions
          .filter((item) => ['RETRY_SHOPIFY_SYNC', 'TRIGGER_DATA_REFRESH'].includes(item.type))
          .slice(0, 2)
          .map((item) => this.executionLink(item.id, item.type, item.status)),
        linkedAgentRuns: agentRuns
          .filter((item) => ['integration_guard_agent', 'commerce_health_agent'].includes(item.agentDefinition.code))
          .slice(0, 2)
          .map((item) => this.agentRunLink(item.id, item.agentDefinition.name, item.summary)),
        linkedOutcomeSummary: this.outcomeSummaryLink(outcomes),
        successCriteria: [
          'Data trust returns to healthy or materially improves.',
          'Sync-related limitations are reduced in executive reporting.',
          'Trust-related open proposals are reviewed.',
        ],
      });
    }

    if (customerSignals.length > 0 || recommendations.some((item) => item.type === 'investigate_customer_slowdown')) {
      candidates.push({
        candidateKey: 'customer-momentum',
        title: 'Recover customer momentum',
        description:
          'Create a customer momentum priority so leadership can distinguish acquisition and retention pressure before broadening spend.',
        category: 'customers',
        urgency: this.maxUrgencyFromSignals(customerSignals, 'medium'),
        rationale:
          customerSignals[0]?.summary ??
          'Customer momentum remains soft enough to justify a tracked operating priority.',
        linkedSignals: customerSignals.slice(0, 3).map((item) => this.signalLink(item.id, item.title, item.summary)),
        linkedRecommendations: recommendations
          .filter((item) => item.type === 'investigate_customer_slowdown')
          .slice(0, 2)
          .map((item) => this.recommendationLink(item.id, item.title, item.summary)),
        linkedProposals: proposals
          .filter((item) => item.proposalType === 'monitor_customer_decline')
          .slice(0, 2)
          .map((item) => this.proposalLink(item.id, item.title, item.status)),
        linkedScenarios: [
          this.scenarioLink('customer_slowdown_persists', 'Customer slowdown persists'),
          this.scenarioLink('no_action_taken', 'No action taken'),
        ],
        linkedExecutions: [],
        linkedAgentRuns: agentRuns
          .filter((item) => item.agentDefinition.code === 'customer_momentum_agent')
          .slice(0, 1)
          .map((item) => this.agentRunLink(item.id, item.agentDefinition.name, item.summary)),
        linkedOutcomeSummary: this.outcomeSummaryLink(outcomes),
        successCriteria: [
          'Customer slowdown signals reduce in severity or recency.',
          'Customer-focused recommendations move out of the top priority tier.',
          'Leadership has reviewed acquisition and retention drivers.',
        ],
      });
    }

    if (
      paymentSignals.length > 0 ||
      !trust.integrations.stripe.connected ||
      recommendations.some((item) => item.type === 'review_payment_reliability')
    ) {
      candidates.push({
        candidateKey: 'payments-visibility',
        title: 'Restore payments visibility',
        description:
          'Track payments visibility as a formal priority so payment reliability and margin interpretation stop running on incomplete data.',
        category: 'payments',
        urgency: paymentSignals.length > 0 || !trust.integrations.stripe.connected ? 'high' : 'medium',
        rationale:
          paymentSignals[0]?.summary ??
          'Payments visibility remains incomplete enough to limit confident executive decisions.',
        linkedSignals: paymentSignals.slice(0, 3).map((item) => this.signalLink(item.id, item.title, item.summary)),
        linkedRecommendations: recommendations
          .filter((item) => item.type === 'review_payment_reliability')
          .slice(0, 2)
          .map((item) => this.recommendationLink(item.id, item.title, item.summary)),
        linkedProposals: proposals
          .filter((item) => item.proposalType === 'review_payment_connection')
          .slice(0, 2)
          .map((item) => this.proposalLink(item.id, item.title, item.status)),
        linkedScenarios: [this.scenarioLink('payments_visibility_missing', 'Payments visibility remains missing')],
        linkedExecutions: executions
          .filter((item) => ['RETRY_STRIPE_SYNC', 'RECONNECT_STORE'].includes(item.type))
          .slice(0, 2)
          .map((item) => this.executionLink(item.id, item.type, item.status)),
        linkedAgentRuns: agentRuns
          .filter((item) => item.agentDefinition.code === 'integration_guard_agent')
          .slice(0, 1)
          .map((item) => this.agentRunLink(item.id, item.agentDefinition.name, item.summary)),
        linkedOutcomeSummary: this.outcomeSummaryLink(outcomes),
        successCriteria: [
          'Payments visibility becomes available and current.',
          'Payment-related limitations are reduced.',
          'Payment-related recommendations are no longer constrained by missing data.',
        ],
      });
    }

    if (demandSignals.length > 0) {
      candidates.push({
        candidateKey: 'catalog-and-operations',
        title: 'Manage demand concentration and operating pressure',
        description:
          'Elevated demand or product concentration should become a structured operating priority before leadership expands further into the current spike.',
        category: demandSignals.some((item) => item.type === 'product_concentration_risk') ? 'catalog' : 'operations',
        urgency: this.maxUrgencyFromSignals(demandSignals, 'medium'),
        rationale:
          demandSignals[0]?.summary ??
          'Demand-side opportunity is present, but it may carry concentration or execution risk.',
        linkedSignals: demandSignals.slice(0, 3).map((item) => this.signalLink(item.id, item.title, item.summary)),
        linkedRecommendations: recommendations
          .filter((item) => ['capitalize_on_demand_spike', 'reduce_product_concentration'].includes(item.type))
          .slice(0, 2)
          .map((item) => this.recommendationLink(item.id, item.title, item.summary)),
        linkedProposals: proposals
          .filter((item) => item.proposalType === 'inspect_product_anomaly')
          .slice(0, 1)
          .map((item) => this.proposalLink(item.id, item.title, item.status)),
        linkedScenarios: [this.scenarioLink('demand_spike_continues', 'Demand spike continues')],
        linkedExecutions: [],
        linkedAgentRuns: agentRuns
          .filter((item) => ['commerce_health_agent', 'revenue_monitor_agent'].includes(item.agentDefinition.code))
          .slice(0, 1)
          .map((item) => this.agentRunLink(item.id, item.agentDefinition.name, item.summary)),
        linkedOutcomeSummary: this.outcomeSummaryLink(outcomes),
        successCriteria: [
          'Demand-related risk is reviewed before expansion decisions.',
          'Concentration risk is reduced or better understood.',
          'Leadership has visibility into whether the spike is sustainable.',
        ],
      });
    }

    return candidates.slice(0, 6);
  }

  private async refreshPlanSummary(planId: string) {
    const plan = await this.prismaService.strategicPlan.findUnique({
      where: { id: planId },
      include: { priorities: { orderBy: [{ urgency: 'desc' }, { updatedAt: 'desc' }] } },
    });

    if (!plan) {
      return;
    }

    const summary = this.buildPlanSummary(plan.priorities.map((priority) => this.toPriorityView(priority)));
    await this.prismaService.strategicPlan.update({
      where: { id: plan.id },
      data: { summary },
    });
  }

  private buildPlanSummary(
    priorities: StrategicPriorityView[],
    candidates: StrategicPriorityCandidate[] = [],
  ) {
    if (priorities.length === 0) {
      if (candidates.length === 0) {
        return 'Strategic priorities will appear as Nexora identifies meaningful patterns and actions.';
      }

      return `The current planning window is ready to focus on ${this.joinLabels(
        candidates.slice(0, 3).map((item) => item.title.toLowerCase()),
      )}.`;
    }

    return `The current plan focuses on ${this.joinLabels(
      priorities.slice(0, 3).map((item) => item.title.toLowerCase()),
    )}.`;
  }

  private buildWorkspaceLimitations(
    trust: CanonicalDataTrustStatus,
    candidates: StrategicPriorityCandidate[],
  ) {
    const limitations = [...trust.limitations];

    if (!trust.integrations.shopify.connected) {
      limitations.push('Strategic priorities become available once store data is connected.');
    }

    if (candidates.length === 0) {
      limitations.push('There is not enough recent operating activity to suggest strong strategic priorities yet.');
    }

    return [...new Set(limitations)].slice(0, 4);
  }

  private async findPlan(organizationId: string, planningWindow: StrategicPlanningWindow | null) {
    return this.prismaService.strategicPlan.findFirst({
      where: {
        organizationId,
        ...(planningWindow ? { planningWindow } : {}),
        status: { in: [StrategicPlanStatus.ACTIVE, StrategicPlanStatus.DRAFT] },
      },
      include: {
        priorities: {
          orderBy: [{ urgency: 'desc' }, { updatedAt: 'desc' }],
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  private async requirePlanInScope(principal: CurrentPrincipal, planId: string) {
    const plan = await this.prismaService.strategicPlan.findUnique({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundException('Strategic plan not found.');
    }

    const resolvedOrganizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      plan.organizationId,
    );

    if (resolvedOrganizationId !== plan.organizationId) {
      throw new NotFoundException('Strategic plan not found.');
    }

    return plan;
  }

  private async requirePriorityInPlan(planId: string, priorityId: string) {
    const priority = await this.prismaService.strategicPriority.findFirst({
      where: { id: priorityId, strategicPlanId: planId },
    });

    if (!priority) {
      throw new NotFoundException('Strategic priority not found.');
    }

    return priority;
  }

  private async getPriorityView(priorityId: string) {
    const priority = await this.prismaService.strategicPriority.findUnique({ where: { id: priorityId } });

    if (!priority) {
      throw new NotFoundException('Strategic priority not found.');
    }

    return this.toPriorityView(priority);
  }

  private toPlanView(
    plan: Prisma.StrategicPlanGetPayload<{ include: { priorities: true } }>,
  ): StrategicPlanView {
    return {
      id: plan.id,
      organizationId: plan.organizationId,
      title: plan.title,
      planningWindow: this.fromPlanningWindow(plan.planningWindow),
      status: this.fromPlanStatus(plan.status),
      summary: plan.summary ?? 'No strategic priorities have been activated yet.',
      priorities: plan.priorities.map((priority) => this.toPriorityView(priority)),
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  private toPriorityView(priority: Prisma.StrategicPriorityGetPayload<Record<string, never>>): StrategicPriorityView {
    return {
      id: priority.id,
      strategicPlanId: priority.strategicPlanId,
      title: priority.title,
      description: priority.description,
      category: this.fromPriorityCategory(priority.category),
      status: this.fromPriorityStatus(priority.status),
      urgency: this.fromPriorityUrgency(priority.urgency),
      linkedSignals: this.asArtifactLinks(priority.linkedSignals),
      linkedRecommendations: this.asArtifactLinks(priority.linkedRecommendations),
      linkedProposals: this.asArtifactLinks(priority.linkedProposals),
      linkedScenarios: this.asScenarioLinks(priority.linkedScenarios),
      linkedExecutions: this.asArtifactLinks(priority.linkedExecutions),
      linkedAgentRuns: this.asArtifactLinks(priority.linkedAgentRuns),
      linkedOutcomeSummary: this.asOutcomeSummary(priority.linkedOutcomeSummary),
      successCriteria: this.asStringArray(priority.successCriteria),
      owner: priority.owner,
      targetDate: priority.targetDate?.toISOString() ?? null,
      notes: priority.notes,
      createdAt: priority.createdAt.toISOString(),
      updatedAt: priority.updatedAt.toISOString(),
    };
  }

  private outcomeSummaryLink(outcomes: { summary: string; learningTrend: { status: string }; outcomeSummary: { positiveOutcomeRate: number } }): StrategicOutcomeSummary {
    return {
      summary: outcomes.summary,
      trend: outcomes.learningTrend.status,
      positiveOutcomeRate: outcomes.outcomeSummary.positiveOutcomeRate,
    };
  }

  private signalLink(id: string, title: string, detail?: string | null): StrategicArtifactLink {
    return { id, title, detail: detail ?? null, href: '/shopify/signals', type: 'signal' };
  }

  private recommendationLink(id: string, title: string, detail?: string | null): StrategicArtifactLink {
    return { id, title, detail: detail ?? null, href: '/shopify/recommendations', type: 'recommendation' };
  }

  private proposalLink(id: string, title: string, status?: string | null): StrategicArtifactLink {
    return { id, title, status: status ?? null, href: '/shopify/action-proposals', type: 'proposal' };
  }

  private executionLink(id: string, title: string, status?: string | null): StrategicArtifactLink {
    return { id, title, status: status ?? null, href: '/ai/proposals', type: 'execution' };
  }

  private agentRunLink(id: string, title: string, detail?: string | null): StrategicArtifactLink {
    return { id, title, detail: detail ?? null, href: '/ai/runs', type: 'agent_run' };
  }

  private scenarioLink(scenarioType: string, title: string): StrategicScenarioLink {
    return {
      id: scenarioType,
      title,
      scenarioType,
      detail: 'Directional scenario planning support.',
    };
  }

  private maxUrgencyFromSignals(
    signals: Array<{ severity: string }>,
    fallback: StrategicPriorityView['urgency'],
  ): StrategicPriorityView['urgency'] {
    if (signals.some((item) => ['critical', 'high'].includes(item.severity))) {
      return 'high';
    }
    if (signals.some((item) => item.severity === 'medium')) {
      return 'medium';
    }
    return fallback;
  }

  private joinLabels(items: string[]) {
    if (items.length === 1) {
      return items[0];
    }
    if (items.length === 2) {
      return `${items[0]} and ${items[1]}`;
    }
    return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
  }

  private toPlanningWindow(value: QueryStrategicPlanDto['planningWindow']) {
    switch (value) {
      case 'next_30_days':
        return StrategicPlanningWindow.NEXT_30_DAYS;
      case 'next_quarter':
        return StrategicPlanningWindow.NEXT_QUARTER;
      case 'current_cycle':
      default:
        return StrategicPlanningWindow.CURRENT_CYCLE;
    }
  }

  private fromPlanningWindow(value: StrategicPlanningWindow): StrategicPlanView['planningWindow'] {
    switch (value) {
      case StrategicPlanningWindow.NEXT_30_DAYS:
        return 'next_30_days';
      case StrategicPlanningWindow.NEXT_QUARTER:
        return 'next_quarter';
      case StrategicPlanningWindow.CURRENT_CYCLE:
      default:
        return 'current_cycle';
    }
  }

  private toPlanStatus(value: NonNullable<CreateStrategicPlanDto['status'] | UpdateStrategicPlanDto['status']>) {
    switch (value) {
      case 'active':
        return StrategicPlanStatus.ACTIVE;
      case 'archived':
        return StrategicPlanStatus.ARCHIVED;
      case 'draft':
      default:
        return StrategicPlanStatus.DRAFT;
    }
  }

  private fromPlanStatus(value: StrategicPlanStatus): StrategicPlanView['status'] {
    switch (value) {
      case StrategicPlanStatus.ACTIVE:
        return 'active';
      case StrategicPlanStatus.ARCHIVED:
        return 'archived';
      case StrategicPlanStatus.DRAFT:
      default:
        return 'draft';
    }
  }

  private toPriorityCategory(value: StrategicPriorityView['category']) {
    return value.toUpperCase() as StrategicPriorityCategory;
  }

  private fromPriorityCategory(value: StrategicPriorityCategory): StrategicPriorityView['category'] {
    return value.toLowerCase() as StrategicPriorityView['category'];
  }

  private toPriorityStatus(value: StrategicPriorityView['status']) {
    switch (value) {
      case 'in_progress':
        return StrategicPriorityStatus.IN_PROGRESS;
      case 'blocked':
        return StrategicPriorityStatus.BLOCKED;
      case 'completed':
        return StrategicPriorityStatus.COMPLETED;
      case 'identified':
      default:
        return StrategicPriorityStatus.IDENTIFIED;
    }
  }

  private fromPriorityStatus(value: StrategicPriorityStatus): StrategicPriorityView['status'] {
    switch (value) {
      case StrategicPriorityStatus.IN_PROGRESS:
        return 'in_progress';
      case StrategicPriorityStatus.BLOCKED:
        return 'blocked';
      case StrategicPriorityStatus.COMPLETED:
        return 'completed';
      case StrategicPriorityStatus.IDENTIFIED:
      default:
        return 'identified';
    }
  }

  private toPriorityUrgency(value: StrategicPriorityView['urgency']) {
    return value.toUpperCase() as StrategicPriorityUrgency;
  }

  private fromPriorityUrgency(value: StrategicPriorityUrgency): StrategicPriorityView['urgency'] {
    return value.toLowerCase() as StrategicPriorityView['urgency'];
  }

  private defaultPlanTitle(planningWindow: StrategicPlanningWindow) {
    switch (planningWindow) {
      case StrategicPlanningWindow.NEXT_30_DAYS:
        return 'Next 30 Days Strategic Plan';
      case StrategicPlanningWindow.NEXT_QUARTER:
        return 'Next Quarter Strategic Plan';
      case StrategicPlanningWindow.CURRENT_CYCLE:
      default:
        return 'Current Cycle Strategic Plan';
    }
  }

  private toJsonArray(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }
    return (Array.isArray(value) ? value : []) as Prisma.InputJsonValue;
  }

  private toJsonObject(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Prisma.InputJsonValue;
    }
    return null as unknown as Prisma.InputJsonValue;
  }

  private asArtifactLinks(value: Prisma.JsonValue | null): StrategicArtifactLink[] {
    return Array.isArray(value) ? (value as StrategicArtifactLink[]) : [];
  }

  private asScenarioLinks(value: Prisma.JsonValue | null): StrategicScenarioLink[] {
    return Array.isArray(value) ? (value as StrategicScenarioLink[]) : [];
  }

  private asOutcomeSummary(value: Prisma.JsonValue | null): StrategicOutcomeSummary | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as StrategicOutcomeSummary)
      : null;
  }

  private asStringArray(value: Prisma.JsonValue | null): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}
