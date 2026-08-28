import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AgentsService } from '../agents/agents.service';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AiActionProposalEngineService } from './ai-action-proposal-engine.service';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { AiConnectedStoresService, ConnectedStoreStatus } from './ai-connected-stores.service';
import { AiDataTrustService, CanonicalDataTrustStatus } from './ai-data-trust.service';
import { AiDailyBriefService } from './ai-daily-brief.service';
import { AiExecutionService } from './ai-execution.service';
import { AiLearningService } from './ai-learning.service';
import { AiRecommendationService, CanonicalAiRecommendation } from './ai-recommendation.service';
import { AiSignalService, CanonicalAiSignal } from './ai-signal.service';
import { QueryAiOrganizationDto } from './dto/query-ai-organization.dto';

type ExecutiveCopilotPendingAction = {
  id: string;
  kind: 'proposal' | 'execution';
  title: string;
  summary: string;
  status: string;
  priority: string;
  riskLevel: string;
  targetLabel: string | null;
  href: string;
};

type ExecutiveCopilotAgentHighlight = {
  runId: string;
  agentKey: string;
  agentName: string;
  triggerType: string;
  triggerReason: string | null;
  status: string;
  summary: string;
  topConcern: string | null;
  startedAt: string;
  completedAt: string | null;
};

type ExecutiveCopilotLearningHighlights = {
  totalActionsTracked: number;
  positiveOutcomeRate: number;
  operatorApprovalRate: number;
  summary: string;
};

type ExecutiveCopilotTopSummary = {
  summary: string;
  whatChanged: string;
  whatMatters: string;
};

type ExecutiveCopilotStoreStatus = {
  totalStores: number;
  primaryStore: ConnectedStoreStatus | null;
  summary: string;
};

export type ExecutiveCopilotResponse = {
  organizationId: string;
  generatedAt: string;
  trust: CanonicalDataTrustStatus;
  topSummary: ExecutiveCopilotTopSummary;
  keySignals: CanonicalAiSignal[];
  keyRecommendations: CanonicalAiRecommendation[];
  pendingActions: ExecutiveCopilotPendingAction[];
  agentHighlights: ExecutiveCopilotAgentHighlight[];
  learningHighlights: ExecutiveCopilotLearningHighlights;
  connectedStoreStatus: ExecutiveCopilotStoreStatus;
  executiveFocus: string[];
};

@Injectable()
export class AiExecutiveCopilotService {
  constructor(
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiDataTrustService: AiDataTrustService,
    private readonly aiDailyBriefService: AiDailyBriefService,
    private readonly aiSignalService: AiSignalService,
    private readonly aiRecommendationService: AiRecommendationService,
    private readonly aiActionProposalEngineService: AiActionProposalEngineService,
    private readonly aiExecutionService: AiExecutionService,
    private readonly aiLearningService: AiLearningService,
    private readonly aiConnectedStoresService: AiConnectedStoresService,
    private readonly agentsService: AgentsService,
  ) {}

  async getExecutiveCopilot(principal: CurrentPrincipal, query: QueryAiOrganizationDto) {
    const payload = await this.getExecutiveCopilotPayload(principal, query.organizationId, false);

    return buildSuccessResponse('Executive copilot retrieved successfully.', payload);
  }

  async refreshExecutiveCopilot(principal: CurrentPrincipal, dto: QueryAiOrganizationDto) {
    const payload = await this.getExecutiveCopilotPayload(principal, dto.organizationId, true);

    return buildSuccessResponse('Executive copilot refreshed successfully.', payload);
  }

  async getExecutiveCopilotPayload(
    principal: CurrentPrincipal,
    organizationId: string | undefined,
    forceRefresh: boolean,
  ) {
    const scopedOrganizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      organizationId,
    );

    return this.buildExecutiveCopilot(principal, scopedOrganizationId, forceRefresh);
  }

  private async buildExecutiveCopilot(
    principal: CurrentPrincipal,
    organizationId: string,
    forceRefresh: boolean,
  ): Promise<ExecutiveCopilotResponse> {
    const [
      trust,
      dailyBriefResponse,
      signals,
      recommendations,
      proposals,
      executionsResponse,
      learningResponse,
      storesResponse,
      agentRunsResponse,
    ] = await Promise.all([
      this.aiDataTrustService.getTrustForOrganization(organizationId),
      this.aiDailyBriefService.getDailyBrief(principal, { organizationId }),
      this.aiSignalService.getCanonicalSignals(principal, { organizationId }, { forceRefresh }),
      this.aiRecommendationService.getCanonicalRecommendations(
        principal,
        { organizationId },
        { forceRefresh },
      ),
      this.aiActionProposalEngineService.ensureCurrentProposals(principal, organizationId, forceRefresh),
      this.aiExecutionService.listExecutions(principal, { organizationId }),
      this.aiLearningService.getLearningInsights(principal, { organizationId }),
      this.aiConnectedStoresService.listConnectedStores(principal, { organizationId }),
      this.agentsService.listCommerceRuns(principal, {
        organizationId,
        page: 1,
        limit: 6,
      }),
    ]);

    const dailyBrief = dailyBriefResponse.data as {
      summary: string;
      signals: string[];
      risks: string[];
      actions: string[];
    };
    const executionItems = executionsResponse.data as Array<Record<string, unknown>>;
    const stores = storesResponse.data as ConnectedStoreStatus[];
    const learning = learningResponse.data as {
      summary: {
        totalActionsTracked: number;
        positiveOutcomeRate: number;
        operatorApprovalRate: number;
      };
    };
    const agentRuns = agentRunsResponse.data as Array<Record<string, unknown>>;

    const keySignals = signals.slice(0, 5);
    const keyRecommendations = recommendations.slice(0, 3);
    const pendingActions = this.buildPendingActions(proposals, executionItems);
    const agentHighlights = this.buildAgentHighlights(agentRuns);
    const learningHighlights = this.buildLearningHighlights(learning);
    const connectedStoreStatus = this.buildConnectedStoreStatus(stores);
    const topSummary = this.buildTopSummary({
      trust,
      dailyBrief,
      signals: keySignals,
      recommendations: keyRecommendations,
      pendingActions,
    });
    const executiveFocus = this.buildExecutiveFocus({
      trust,
      dailyBrief,
      signals: keySignals,
      recommendations: keyRecommendations,
      pendingActions,
      agentHighlights,
    });

    return {
      organizationId,
      generatedAt: new Date().toISOString(),
      trust,
      topSummary,
      keySignals,
      keyRecommendations,
      pendingActions,
      agentHighlights,
      learningHighlights,
      connectedStoreStatus,
      executiveFocus,
    };
  }

  private buildTopSummary(input: {
    trust: CanonicalDataTrustStatus;
    dailyBrief: {
      summary: string;
      signals: string[];
      risks: string[];
      actions: string[];
    };
    signals: CanonicalAiSignal[];
    recommendations: CanonicalAiRecommendation[];
    pendingActions: ExecutiveCopilotPendingAction[];
  }): ExecutiveCopilotTopSummary {
    const topSignal = input.signals[0] ?? null;
    const topRecommendation = input.recommendations[0] ?? null;
    const topPendingAction = input.pendingActions[0] ?? null;

    if (!input.trust.integrations.shopify.connected) {
      return {
        summary: 'Connect your store to enable executive insights.',
        whatChanged: 'Store data is not connected yet.',
        whatMatters: 'Leadership reporting will remain unavailable until Shopify is connected.',
      };
    }

    if (!input.trust.integrations.shopify.lastSuccessfulSyncAt) {
      return {
        summary: 'Executive insights will become available once initial data is collected.',
        whatChanged: 'Your store is connected, but the first successful sync has not completed yet.',
        whatMatters: 'Trend comparisons and leadership guidance will strengthen as current store data arrives.',
      };
    }

    return {
      summary: this.compactSentences([
        input.dailyBrief.summary,
        input.trust.overallStatus === 'healthy' ||
        input.dailyBrief.summary.toLowerCase().includes(input.trust.recommendedOperatorMessage.toLowerCase())
          ? null
          : input.trust.recommendedOperatorMessage,
      ]),
      whatChanged:
        topSignal?.summary ??
        input.dailyBrief.signals[0] ??
        'No significant changes detected.',
      whatMatters:
        topPendingAction?.summary ??
        topRecommendation?.summary ??
        topSignal?.recommendedNextStep ??
        input.dailyBrief.actions[0] ??
        'No major issues require leadership attention right now.',
    };
  }

  private buildPendingActions(
    proposals: Array<{
      id: string;
      title: string;
      description: string;
      status: string;
      source: string;
      priority: string;
      proposalType: string;
      latestDecisionNote: string | null;
      metadata: Prisma.JsonValue | null;
    }>,
    executions: Array<Record<string, unknown>>,
  ): ExecutiveCopilotPendingAction[] {
    const proposalItems = proposals
      .filter((proposal) => ['PENDING', 'IN_REVIEW', 'NEEDS_REVISION', 'DEFERRED'].includes(proposal.status))
      .map((proposal) => {
        const view = this.aiActionProposalEngineService.toProposalView(proposal);

        return {
          id: proposal.id,
          kind: 'proposal' as const,
          title: proposal.title,
          summary: view.summary ?? proposal.description,
          status: proposal.status,
          priority: proposal.priority,
          riskLevel: view.riskLevel ?? 'medium',
          targetLabel: view.targetEntityType ?? null,
          href: '/shopify/action-proposals',
        };
      });

    const executionItems = executions
      .filter((execution) => ['PENDING_APPROVAL', 'FAILED'].includes(String(execution.status ?? '')))
      .map((execution) => ({
        id: String(execution.id),
        kind: 'execution' as const,
        title:
          typeof execution.proposal === 'object' &&
          execution.proposal !== null &&
          'title' in (execution.proposal as Record<string, unknown>)
            ? String((execution.proposal as Record<string, unknown>).title ?? 'Action execution')
            : 'Action execution',
        summary:
          String(execution.status) === 'FAILED'
            ? String(execution.error ?? 'An approved action execution failed and needs review.')
            : 'An approved action is waiting for review before execution.',
        status: String(execution.status ?? 'UNKNOWN'),
        priority: 'HIGH',
        riskLevel: String(execution.status) === 'FAILED' ? 'high' : 'medium',
        targetLabel: null,
        href: '/shopify/action-proposals',
      }));

    return [...proposalItems, ...executionItems].slice(0, 5);
  }

  private buildAgentHighlights(agentRuns: Array<Record<string, unknown>>): ExecutiveCopilotAgentHighlight[] {
    return agentRuns
      .filter((run) => typeof run.summary === 'string' && run.summary.trim().length > 0)
      .slice(0, 3)
      .map((run) => {
        const inputContext =
          run.inputContext && typeof run.inputContext === 'object'
            ? (run.inputContext as Record<string, unknown>)
            : null;
        const orchestration =
          inputContext &&
          typeof inputContext.orchestration === 'object' &&
          inputContext.orchestration
            ? (inputContext.orchestration as Record<string, unknown>)
            : null;

        return {
          runId: String(run.id),
          agentKey: String(run.agentCode ?? 'commerce_health_agent'),
          agentName: String(run.agentName ?? 'Commerce Health Agent'),
          triggerType: String(run.triggerType ?? 'MANUAL'),
          triggerReason:
            orchestration && typeof orchestration.reason === 'string'
              ? orchestration.reason
              : null,
          status: String(run.status ?? 'UNKNOWN'),
          summary: String(run.summary ?? ''),
          topConcern:
            orchestration && typeof orchestration.reason === 'string'
              ? orchestration.reason
              : null,
          startedAt: String(run.startedAt),
          completedAt: (run.completedAt as string | null) ?? null,
        };
      });
  }

  private buildLearningHighlights(learning: {
    summary: {
      totalActionsTracked: number;
      positiveOutcomeRate: number;
      operatorApprovalRate: number;
    };
  }): ExecutiveCopilotLearningHighlights {
    const positiveOutcomeRate = learning.summary.positiveOutcomeRate ?? 0;
    const operatorApprovalRate = learning.summary.operatorApprovalRate ?? 0;

    return {
      totalActionsTracked: learning.summary.totalActionsTracked ?? 0,
      positiveOutcomeRate,
      operatorApprovalRate,
      summary:
        learning.summary.totalActionsTracked > 0
          ? `${this.formatPercent(positiveOutcomeRate)} of tracked actions were marked helpful, and ${this.formatPercent(operatorApprovalRate)} of reviewed actions were approved.`
          : 'Learning trends will appear once more reviewed actions and outcomes are recorded.',
    };
  }

  private buildConnectedStoreStatus(stores: ConnectedStoreStatus[]): ExecutiveCopilotStoreStatus {
    const connectedStores = stores.filter((store) => store.connectionStatus !== 'not_connected');
    const primaryStore = connectedStores[0] ?? stores[0] ?? null;

    return {
      totalStores: connectedStores.length,
      primaryStore,
      summary:
        !primaryStore || primaryStore.connectionStatus === 'not_connected'
          ? 'Connect your store to enable executive insights.'
          : primaryStore.connectionStatus === 'connecting'
            ? 'Your store is connected. Initial data is still being collected.'
            : primaryStore.connectionStatus === 'attention_required'
              ? 'Store data needs attention before leadership should rely on current trends.'
              : `Store connection is healthy for ${primaryStore.storeName}.`,
    };
  }

  private buildExecutiveFocus(input: {
    trust: CanonicalDataTrustStatus;
    dailyBrief: {
      actions: string[];
    };
    signals: CanonicalAiSignal[];
    recommendations: CanonicalAiRecommendation[];
    pendingActions: ExecutiveCopilotPendingAction[];
    agentHighlights: ExecutiveCopilotAgentHighlight[];
  }) {
    const focusItems = this.compactList([
      input.trust.overallStatus === 'healthy' ? null : input.trust.recommendedOperatorMessage,
      input.pendingActions[0]?.summary ?? null,
      input.recommendations[0]?.title ?? null,
      input.signals[0]?.recommendedNextStep ?? null,
      input.agentHighlights[0]?.summary ?? null,
      ...input.dailyBrief.actions,
    ]);

    return focusItems.slice(0, 5);
  }

  private compactSentences(items: Array<string | null | undefined>) {
    const unique: string[] = [];

    for (const item of items) {
      const normalized = item?.trim();
      if (!normalized) {
        continue;
      }

      if (!unique.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
        unique.push(normalized.replace(/\.+$/u, ''));
      }
    }

    return unique.map((item) => `${item}.`).join(' ');
  }

  private compactList(items: Array<string | null | undefined>) {
    const unique: string[] = [];

    for (const item of items) {
      const normalized = item?.trim();
      if (!normalized) {
        continue;
      }

      if (!unique.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
        unique.push(normalized);
      }
    }

    return unique;
  }

  private formatPercent(value: number) {
    return `${Math.round(value * 100)}%`;
  }
}
