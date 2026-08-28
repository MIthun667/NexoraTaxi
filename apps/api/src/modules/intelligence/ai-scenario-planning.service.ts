import { Injectable } from '@nestjs/common';
import { ActionExecutionType } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AiActionProposalEngineService } from './ai-action-proposal-engine.service';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { AiDataTrustService, CanonicalDataTrustStatus } from './ai-data-trust.service';
import { AiExecutiveCopilotService, ExecutiveCopilotResponse } from './ai-executive-copilot.service';
import { AiExecutionService } from './ai-execution.service';
import { AiLearningService } from './ai-learning.service';
import { AiOutcomeAnalyticsService, OutcomeAnalyticsResponse } from './ai-outcome-analytics.service';
import { AiRecommendationService, CanonicalAiRecommendation } from './ai-recommendation.service';
import { AiSignalService, CanonicalAiSignal } from './ai-signal.service';
import { AnalyzeScenarioDto } from './dto/analyze-scenario.dto';

export type ScenarioType =
  | 'revenue_slowdown_persists'
  | 'customer_slowdown_persists'
  | 'sync_issue_persists'
  | 'payments_visibility_missing'
  | 'demand_spike_continues'
  | 'no_action_taken'
  | 'action_executed';

type ScenarioConfidence = 'low' | 'medium' | 'high';

type ScenarioOption = {
  type: ScenarioType;
  title: string;
  description: string;
  supportsProposalContext: boolean;
  supportsExecutionContext: boolean;
};

type ScenarioAnalysisContext = {
  organizationId: string;
  trust: CanonicalDataTrustStatus;
  copilot: ExecutiveCopilotResponse;
  outcomeAnalytics: OutcomeAnalyticsResponse;
  signals: CanonicalAiSignal[];
  recommendations: CanonicalAiRecommendation[];
  proposals: Array<{
    id: string;
    proposalType: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    metadata?: Record<string, unknown> | null;
  }>;
  executions: Array<{
    id: string;
    type: string;
    status: string;
    approvalStatus: string;
    createdAt: string;
    proposalId: string | null;
  }>;
  learningInsights: {
    totalActionsTracked: number;
    positiveOutcomeRate: number;
    operatorApprovalRate: number;
  };
};

export type ScenarioAnalysisResponse = {
  organizationId: string;
  generatedAt: string;
  trust: CanonicalDataTrustStatus;
  scenarioType: ScenarioType | 'unsupported';
  summary: string;
  inputAssumptions: string[];
  expectedEffects: string[];
  risks: string[];
  recommendedMitigations: string[];
  confidence: ScenarioConfidence;
  limitations: string[];
  followUps: string[];
};

const SCENARIO_OPTIONS: ScenarioOption[] = [
  {
    type: 'revenue_slowdown_persists',
    title: 'Revenue slowdown persists',
    description: 'Assess what leadership should expect if current revenue pressure continues.',
    supportsProposalContext: false,
    supportsExecutionContext: false,
  },
  {
    type: 'customer_slowdown_persists',
    title: 'Customer slowdown persists',
    description: 'Review the likely operational effect if weaker customer momentum continues.',
    supportsProposalContext: false,
    supportsExecutionContext: false,
  },
  {
    type: 'sync_issue_persists',
    title: 'Sync issue persists',
    description: 'Understand how continuing sync delays weaken trust and decision quality.',
    supportsProposalContext: false,
    supportsExecutionContext: false,
  },
  {
    type: 'payments_visibility_missing',
    title: 'Payments visibility remains missing',
    description: 'See how missing payment data constrains margin and reliability decisions.',
    supportsProposalContext: false,
    supportsExecutionContext: false,
  },
  {
    type: 'demand_spike_continues',
    title: 'Demand spike continues',
    description: 'Review the likely effects if current elevated demand remains in place.',
    supportsProposalContext: false,
    supportsExecutionContext: false,
  },
  {
    type: 'no_action_taken',
    title: 'No action taken',
    description: 'Examine what likely happens if a high-priority recommendation or proposal is left unresolved.',
    supportsProposalContext: true,
    supportsExecutionContext: false,
  },
  {
    type: 'action_executed',
    title: 'Supported action executed',
    description: 'Review the likely operational benefit of executing a bounded supported action.',
    supportsProposalContext: true,
    supportsExecutionContext: true,
  },
] as const;

@Injectable()
export class AiScenarioPlanningService {
  constructor(
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiDataTrustService: AiDataTrustService,
    private readonly aiExecutiveCopilotService: AiExecutiveCopilotService,
    private readonly aiOutcomeAnalyticsService: AiOutcomeAnalyticsService,
    private readonly aiSignalService: AiSignalService,
    private readonly aiRecommendationService: AiRecommendationService,
    private readonly aiActionProposalEngineService: AiActionProposalEngineService,
    private readonly aiExecutionService: AiExecutionService,
    private readonly aiLearningService: AiLearningService,
  ) {}

  getOptions() {
    return buildSuccessResponse('Scenario planning options retrieved successfully.', {
      options: [...SCENARIO_OPTIONS],
    });
  }

  async analyze(principal: CurrentPrincipal, dto: AnalyzeScenarioDto) {
    const scopedOrganizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );
    const normalizedScenarioType = this.normalizeScenarioType(dto.scenarioType);

    if (!normalizedScenarioType) {
      return buildSuccessResponse(
        'Scenario analysis returned with boundary guidance.',
        this.buildUnsupportedScenarioResponse(scopedOrganizationId),
      );
    }

    const context = await this.buildContext(principal, scopedOrganizationId);
    const response = this.buildScenarioResponse(normalizedScenarioType, dto, context);

    return buildSuccessResponse('Scenario analysis generated successfully.', response);
  }

  private async buildContext(
    principal: CurrentPrincipal,
    organizationId: string,
  ): Promise<ScenarioAnalysisContext> {
    const [trust, copilot, outcomeAnalytics, signals, recommendations, proposals, executionResponse, learning] =
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
        this.aiLearningService.getLearningInsights(principal, { organizationId }),
      ]);

    const executions = (executionResponse.data as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id),
      type: String(item.type),
      status: String(item.status),
      approvalStatus: String(item.approvalStatus),
      createdAt: String(item.createdAt),
      proposalId: typeof item.proposalId === 'string' ? item.proposalId : null,
    }));

    const learningInsights = (learning.data as {
      summary: {
        totalActionsTracked: number;
        positiveOutcomeRate: number;
        operatorApprovalRate: number;
      };
    }).summary;

    return {
      organizationId,
      trust,
      copilot,
      outcomeAnalytics,
      signals,
      recommendations,
      proposals: proposals.map((proposal) => ({
        id: proposal.id,
        proposalType: proposal.proposalType,
        title: proposal.title,
        description: proposal.description,
        status: proposal.status,
        priority: proposal.priority,
        metadata: this.asRecord(proposal.metadata),
      })),
      executions,
      learningInsights,
    };
  }

  private buildScenarioResponse(
    scenarioType: ScenarioType,
    dto: AnalyzeScenarioDto,
    context: ScenarioAnalysisContext,
  ): ScenarioAnalysisResponse {
    if (!context.trust.integrations.shopify.connected) {
      return {
        organizationId: context.organizationId,
        generatedAt: new Date().toISOString(),
        trust: context.trust,
        scenarioType,
        summary: 'Scenario analysis becomes available once store data is connected.',
        inputAssumptions: ['Store data is not connected yet.'],
        expectedEffects: ['Operational what-if analysis cannot be grounded until source data is available.'],
        risks: ['Leadership decisions would rely on incomplete business visibility.'],
        recommendedMitigations: ['Connect your store to enable grounded scenario analysis.'],
        confidence: 'low',
        limitations: ['Scenario analysis is unavailable until Shopify data is connected.'],
        followUps: ['Connect your store', 'Review data trust', 'Open executive copilot'],
      };
    }

    const selectedProposal =
      (dto.proposalId ? context.proposals.find((proposal) => proposal.id === dto.proposalId) : null) ??
      context.proposals[0] ??
      null;
    const selectedExecutionType = this.resolveExecutionType(dto.actionExecutionType, selectedProposal?.proposalType);
    const limitations = this.buildScenarioLimitations(context);

    const base = {
      organizationId: context.organizationId,
      generatedAt: new Date().toISOString(),
      trust: context.trust,
      scenarioType,
      confidence: this.getScenarioConfidence(context, scenarioType),
      limitations,
    };

    switch (scenarioType) {
      case 'revenue_slowdown_persists':
        return {
          ...base,
          summary: this.joinSentences(
            'If the current revenue slowdown persists, near-term commercial pressure is likely to stay elevated.',
            context.trust.overallStatus === 'healthy'
              ? null
              : 'Interpret this direction cautiously because current data trust is not fully healthy.',
          ),
          inputAssumptions: this.compactList([
            this.primarySignalAssumption(context, ['revenue_drop', 'order_slowdown'], 'Revenue or order slowdown is active now.'),
            'No corrective review or mitigation materially changes the current trend.',
            this.trustAssumption(context.trust),
          ]),
          expectedEffects: this.compactList([
            'Revenue-focused recommendations are likely to remain elevated.',
            'Pending revenue review proposals stay commercially relevant until the slowdown is understood.',
            context.outcomeAnalytics.outcomeSummary.totalRecorded < 3
              ? 'Measured learning signals may remain too light for strong conclusions.'
              : 'Recent outcomes can help indicate whether current mitigations are helping.',
          ]),
          risks: this.compactList([
            'Leadership may react too quickly on pricing or acquisition without understanding the driver.',
            context.trust.overallStatus === 'healthy'
              ? null
              : 'Limited trust reduces confidence in short-term comparisons.',
            selectedProposal ? `Leaving ${selectedProposal.title.toLowerCase()} unresolved keeps the current risk open.` : null,
          ]),
          recommendedMitigations: this.buildMitigations(context, [
            'Review revenue drivers before changing pricing or acquisition spend.',
            'Prioritize any open revenue-related proposal review.',
            'Refresh data trust before acting on recent comparisons if data is delayed.',
          ]),
          followUps: [
            'What actions need review?',
            'Can I trust this trend?',
            'What changed today?',
          ],
        };
      case 'customer_slowdown_persists':
        return {
          ...base,
          summary: this.joinSentences(
            'If customer slowdown persists, leadership should expect customer-focused attention to remain elevated.',
            context.outcomeAnalytics.outcomeSummary.totalRecorded < 3
              ? 'Current conclusions are directional because recent measured outcomes are still light.'
              : null,
          ),
          inputAssumptions: this.compactList([
            this.primarySignalAssumption(context, ['customer_slowdown'], 'Customer slowdown is active now.'),
            'Customer acquisition or retention weakness remains unresolved.',
            this.trustAssumption(context.trust),
          ]),
          expectedEffects: this.compactList([
            'Customer-focused recommendations will likely stay active.',
            'Executive focus shifts toward acquisition quality, retention signals, and repeat demand.',
            'Outcome interpretation may remain weak if customer activity volume stays low.',
          ]),
          risks: this.compactList([
            'Customer weakness can persist without a clear distinction between acquisition and retention pressure.',
            'If trust is limited, leadership may misread whether the slowdown is structural or data-related.',
          ]),
          recommendedMitigations: this.buildMitigations(context, [
            'Inspect acquisition and retention signals to locate the slowdown.',
            'Review customer momentum recommendations before changing spend.',
            'Keep a close review on repeat weak-customer patterns in the brief.',
          ]),
          followUps: [
            'What are the agents seeing?',
            'What should I focus on next?',
            'Can I trust this data?',
          ],
        };
      case 'sync_issue_persists':
        return {
          ...base,
          summary: this.joinSentences(
            'If sync issues continue for another day, trust will weaken further and recent performance changes should be treated more cautiously.',
            'Operational focus should shift toward restoring current visibility before acting on new comparisons.',
          ),
          inputAssumptions: this.compactList([
            this.primarySignalAssumption(context, ['sync_issue'], 'A sync issue is active now.'),
            'No successful refresh or sync recovery completes during the next operating window.',
            this.trustAssumption(context.trust),
          ]),
          expectedEffects: this.compactList([
            'Freshness will remain delayed or stale.',
            'Signals, recommendations, and executive summaries become more directional and less decisive.',
            'Pending actions tied to sync recovery become more important than new optimization ideas.',
          ]),
          risks: this.compactList([
            'Leadership may overreact to changes that are not yet fully reflected in source systems.',
            'Action proposals and outcome measurement become harder to trust while visibility remains degraded.',
          ]),
          recommendedMitigations: this.buildMitigations(context, [
            'Retry sync recovery before relying on new performance changes.',
            'Review any open integration-related proposal immediately.',
            'Use trust limitations explicitly in executive reporting until data is current.',
          ]),
          followUps: [
            'Can I trust this data?',
            'What actions need review?',
            'What are the agents seeing?',
          ],
        };
      case 'payments_visibility_missing':
        return {
          ...base,
          summary: this.joinSentences(
            'If payments visibility remains unavailable, payment and margin interpretation will stay constrained.',
            'Leadership should avoid treating payment-related conclusions as complete until that gap is resolved.',
          ),
          inputAssumptions: this.compactList([
            this.primarySignalAssumption(
              context,
              ['payment_visibility_gap'],
              'Payments visibility is currently missing or limited.',
            ),
            'Stripe remains disconnected or stale through the next review window.',
            this.trustAssumption(context.trust),
          ]),
          expectedEffects: this.compactList([
            'Payment-related recommendations remain constrained by incomplete visibility.',
            'Outcome analytics stay directionally useful but weaker for payments and margin questions.',
            'Executive reporting should keep disclosing the missing payments limitation.',
          ]),
          risks: this.compactList([
            'Leadership may assume payments reliability is improving or weakening without direct evidence.',
            'ROI interpretation remains incomplete for payment-linked actions.',
          ]),
          recommendedMitigations: this.buildMitigations(context, [
            'Connect payments to restore payment visibility.',
            'Treat payment and margin questions as limited until Stripe is current.',
            'Prioritize any open payments-related proposal review.',
          ]),
          followUps: [
            'Can I trust this data?',
            'What should I focus on next?',
            'What actions need review?',
          ],
        };
      case 'demand_spike_continues':
        return {
          ...base,
          summary: this.joinSentences(
            'If elevated demand continues, leadership should expect both opportunity and operational pressure to rise together.',
            context.trust.overallStatus === 'healthy'
              ? null
              : 'Confidence is moderated because current visibility is not fully healthy.',
          ),
          inputAssumptions: this.compactList([
            this.primarySignalAssumption(context, ['demand_spike'], 'Demand is elevated right now.'),
            'Current demand strength remains present through the next operating window.',
            this.trustAssumption(context.trust),
          ]),
          expectedEffects: this.compactList([
            'Opportunity-oriented recommendations remain elevated.',
            'Operational pressure can increase if catalog, fulfillment, or visibility does not keep pace.',
            'Product concentration risk may rise if growth stays concentrated in a narrow set of products.',
          ]),
          risks: this.compactList([
            'Leadership may over-assume the spike is durable without confirming that it is supported operationally.',
            'Visibility limits can make the spike appear cleaner than it is.',
          ]),
          recommendedMitigations: this.buildMitigations(context, [
            'Validate whether demand strength is sustainable and operationally supported.',
            'Review concentration and fulfillment-related risk before leaning further into the spike.',
            'Keep trust and coverage limitations visible in demand reporting.',
          ]),
          followUps: [
            'What changed today?',
            'What are the agents seeing?',
            'Can I trust this trend?',
          ],
        };
      case 'no_action_taken': {
        const subject = selectedProposal?.title ?? context.copilot.keyRecommendations[0]?.title ?? 'the current high-priority item';
        return {
          ...base,
          summary: `If no action is taken, ${subject.toLowerCase()} is likely to remain unresolved and leadership attention will stay anchored on the same issue.`,
          inputAssumptions: this.compactList([
            selectedProposal
              ? `${selectedProposal.title} remains pending or deferred.`
              : 'The highest-priority recommendation or proposal is not reviewed yet.',
            this.trustAssumption(context.trust),
            'No alternative mitigation materially changes the current issue.',
          ]),
          expectedEffects: this.compactList([
            'Current risks remain active in signals, recommendations, and executive focus.',
            'The same recommendation or proposal is likely to stay relevant in upcoming briefings.',
            context.outcomeAnalytics.learningTrend.status === 'insufficient_data'
              ? 'Measured value signals will remain thin until more actions are reviewed and recorded.'
              : 'Learning and outcome trends may stall without additional reviewed actions.',
          ]),
          risks: this.compactList([
            'Leadership attention can stay consumed by a preventable unresolved issue.',
            selectedProposal ? `${selectedProposal.title} may continue aging in the review queue.` : null,
          ]),
          recommendedMitigations: this.buildMitigations(context, [
            'Prioritize proposal review for the highest-priority open item.',
            'Use the executive focus list to decide whether the current issue needs immediate review.',
            'Refresh trust and signals before deciding to defer again.',
          ]),
          followUps: [
            'What actions need review?',
            'What should I focus on next?',
            'What changed today?',
          ],
        };
      }
      case 'action_executed': {
        const executionLabel = this.describeExecutionType(selectedExecutionType);
        return {
          ...base,
          summary: this.joinSentences(
            `If ${executionLabel} is executed successfully, the likely benefit is operational clarity or recovery rather than immediate guaranteed business lift.`,
            'Measured success still depends on the resulting outcome and current data trust.',
          ),
          inputAssumptions: this.compactList([
            `${executionLabel} completes successfully within the current operating window.`,
            'The action uses the existing governed approval and execution path.',
            this.trustAssumption(context.trust),
          ]),
          expectedEffects: this.compactList([
            this.expectedEffectForExecutionType(selectedExecutionType),
            'Related recommendations or proposals may reduce in urgency once the underlying issue is addressed.',
            'Leadership still needs measured outcomes before treating the action as commercially successful.',
          ]),
          risks: this.compactList([
            'Successful execution does not guarantee positive business impact on its own.',
            context.trust.overallStatus === 'healthy'
              ? null
              : 'Weak trust can delay confirmation that the action improved visibility or performance.',
          ]),
          recommendedMitigations: this.buildMitigations(context, [
            'Record and review the measured outcome after execution completes.',
            'Use outcome analytics to confirm whether the action was useful.',
            'Keep the linked recommendation or proposal under review until trust stabilizes.',
          ]),
          followUps: [
            'What actions need review?',
            'How are outcomes trending?',
            'Can I trust this data?',
          ],
        };
      }
    }
  }

  private buildUnsupportedScenarioResponse(organizationId: string): ScenarioAnalysisResponse {
    const trust: CanonicalDataTrustStatus = {
      overallStatus: 'not_connected',
      shopifyStatus: 'not_connected',
      stripeStatus: 'not_connected',
      freshnessStatus: 'stale',
      coverageStatus: 'unavailable',
      limitations: ['Scenario planning currently requires connected store data.'],
      evidence: ['No connected store context was available for this unsupported scenario.'],
      recommendedOperatorMessage: 'Connect your store to enable grounded scenario analysis.',
      updatedAt: new Date().toISOString(),
      integrations: {
        shopify: {
          connected: false,
          storeId: null,
          shopDomain: null,
          latestSyncStatus: null,
          latestSyncAt: null,
          lastSuccessfulSyncAt: null,
          productsAvailable: false,
          ordersAvailable: false,
          customersAvailable: false,
          protectedCustomerDataRequired: false,
        },
        stripe: {
          connected: false,
          accountId: null,
          latestSyncStatus: null,
          latestSyncAt: null,
          lastSuccessfulSyncAt: null,
          paymentsAvailable: false,
        },
      },
    };

    return {
      organizationId,
      generatedAt: new Date().toISOString(),
      trust,
      scenarioType: 'unsupported',
      summary:
        'That scenario is outside the current planning scope. Nexora can analyze bounded scenarios about trust, signals, demand, customer momentum, actions, and supported executions.',
      inputAssumptions: ['The requested scenario type is not supported in the current bounded planning layer.'],
      expectedEffects: ['No analysis was generated because the request is outside supported scenario options.'],
      risks: ['Returning a fabricated scenario would reduce operator trust.'],
      recommendedMitigations: ['Choose one of the supported scenario options.'],
      confidence: 'low',
      limitations: ['Scenario planning currently supports only bounded deterministic scenarios.'],
      followUps: [
        'What happens if sync issues continue?',
        'What happens if customer slowdown persists?',
        'What happens if no action is taken?',
      ],
    };
  }

  private buildScenarioLimitations(context: ScenarioAnalysisContext) {
    const limitations = [...context.trust.limitations];

    if (context.outcomeAnalytics.outcomeSummary.totalRecorded < 3) {
      limitations.push('There is not enough recent measured outcome activity to draw strong conclusions yet.');
    }

    if (context.learningInsights.totalActionsTracked < 3) {
      limitations.push('Learning signals are still directional because only a small number of actions have been tracked.');
    }

    return this.uniqueList(limitations).slice(0, 4);
  }

  private buildMitigations(context: ScenarioAnalysisContext, fallbacks: string[]) {
    const canonical = [
      ...context.copilot.keyRecommendations.map((item) => item.title),
      ...context.copilot.pendingActions.map((item) => item.title),
      ...fallbacks,
    ];

    return this.uniqueList(canonical).slice(0, 5);
  }

  private primarySignalAssumption(
    context: ScenarioAnalysisContext,
    preferredTypes: string[],
    fallback: string,
  ) {
    const signal = context.signals.find((item) => preferredTypes.includes(item.type));
    return signal ? `${signal.title}: ${signal.summary}` : fallback;
  }

  private trustAssumption(trust: CanonicalDataTrustStatus) {
    if (trust.overallStatus === 'healthy') {
      return 'Current source data is broadly up to date and usable for directional planning.';
    }

    return `Current data trust is ${this.humanize(trust.overallStatus)}, so conclusions remain directional.`;
  }

  private getScenarioConfidence(
    context: ScenarioAnalysisContext,
    scenarioType: ScenarioType,
  ): ScenarioConfidence {
    const trustStatus = context.trust.overallStatus;
    const lowOutcomeVolume = context.outcomeAnalytics.outcomeSummary.totalRecorded < 3;

    if (trustStatus === 'not_connected') {
      return 'low';
    }

    if (trustStatus === 'issue_detected' || trustStatus === 'limited') {
      return scenarioType === 'sync_issue_persists' ? 'medium' : 'low';
    }

    if (lowOutcomeVolume && ['no_action_taken', 'action_executed', 'customer_slowdown_persists'].includes(scenarioType)) {
      return 'medium';
    }

    return 'high';
  }

  private resolveExecutionType(
    requestedType: string | undefined,
    proposalType: string | undefined,
  ): ActionExecutionType {
    const normalizedRequested = requestedType?.toUpperCase().trim() ?? '';
    const normalizedProposal = proposalType?.toUpperCase().trim() ?? '';

    if (Object.values(ActionExecutionType).includes(normalizedRequested as ActionExecutionType)) {
      return normalizedRequested as ActionExecutionType;
    }

    if (normalizedProposal.includes('SHOPIFY') && normalizedProposal.includes('SYNC')) {
      return ActionExecutionType.RETRY_SHOPIFY_SYNC;
    }
    if (normalizedProposal.includes('STRIPE') && normalizedProposal.includes('SYNC')) {
      return ActionExecutionType.RETRY_STRIPE_SYNC;
    }
    if (normalizedProposal.includes('REFRESH')) {
      return ActionExecutionType.TRIGGER_DATA_REFRESH;
    }
    if (normalizedProposal.includes('RECONNECT')) {
      return ActionExecutionType.RECONNECT_STORE;
    }

    return ActionExecutionType.TRIGGER_DATA_REFRESH;
  }

  private expectedEffectForExecutionType(executionType: ActionExecutionType) {
    switch (executionType) {
      case ActionExecutionType.RETRY_SHOPIFY_SYNC:
        return 'Current store visibility is more likely to recover, which improves trust in recent performance changes.';
      case ActionExecutionType.RETRY_STRIPE_SYNC:
        return 'Payments visibility is more likely to recover, which improves payment-related interpretation.';
      case ActionExecutionType.RECONNECT_STORE:
        return 'Connection health is more likely to stabilize, which restores the flow of current operational data.';
      case ActionExecutionType.ESCALATE_ISSUE:
        return 'The issue becomes more visible for operator follow-up, but commercial improvement is still not guaranteed.';
      case ActionExecutionType.MARK_RESOLVED:
        return 'The issue can leave the active queue, but leadership still needs measured confirmation that it truly improved.';
      case ActionExecutionType.TRIGGER_DATA_REFRESH:
      default:
        return 'Data freshness is more likely to improve, which strengthens confidence in recent summaries and recommendations.';
    }
  }

  private describeExecutionType(executionType: ActionExecutionType) {
    return executionType
      .toLowerCase()
      .split('_')
      .join(' ');
  }

  private normalizeScenarioType(value: string | undefined): ScenarioType | null {
    const normalized = value?.trim().toLowerCase();
    return (SCENARIO_OPTIONS.find((item) => item.type === normalized)?.type ?? null) as ScenarioType | null;
  }

  private compactList(items: Array<string | null | undefined>) {
    return items.filter((item): item is string => Boolean(item && item.trim()));
  }

  private joinSentences(...items: Array<string | null | undefined>) {
    return this.compactList(items).join(' ');
  }

  private uniqueList(items: string[]) {
    return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return null;
  }

  private humanize(value: string) {
    return value
      .split('_')
      .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
      .join(' ');
  }
}
