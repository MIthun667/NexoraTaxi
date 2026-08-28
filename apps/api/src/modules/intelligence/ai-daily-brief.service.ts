import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { AiDataTrustService, CanonicalDataTrustStatus } from './ai-data-trust.service';
import { AiRecommendationService } from './ai-recommendation.service';
import { AiSignalService, CanonicalAiSignal } from './ai-signal.service';
import { OllamaClientService } from './ollama-client.service';
import { QueryAiOrganizationDto } from './dto/query-ai-organization.dto';

type DailyBriefInput = {
  revenueToday: number;
  revenueYesterday: number;
  ordersToday: number;
  ordersYesterday: number;
  newCustomersToday: number;
  newCustomersYesterday: number;
  signals: Array<{
    type: string;
    severity: string;
    title: string;
    summary: string;
    reason: string;
    recommendedNextStep: string;
  }>;
  recommendations: Array<{
    priority: string;
    title: string;
    description: string;
    rationale: string;
  }>;
  trust: CanonicalDataTrustStatus;
};

type DerivedBriefInsights = {
  revenueChangeRatio: number | null;
  orderChangeRatio: number | null;
  customerChangeRatio: number | null;
  performanceStatus: 'growth' | 'decline' | 'stable';
  customerActivityStatus: 'active' | 'quiet' | 'inactive';
  zeroActivity: boolean;
  unusualRevenueShift: boolean;
  unusualOrderShift: boolean;
};

type DailyBriefPayload = {
  summary: string;
  signals: string[];
  risks: string[];
  actions: string[];
};

@Injectable()
export class AiDailyBriefService {
  constructor(
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiDataTrustService: AiDataTrustService,
    private readonly aiSignalService: AiSignalService,
    private readonly aiRecommendationService: AiRecommendationService,
    private readonly ollamaClientService: OllamaClientService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async getDailyBrief(principal: CurrentPrincipal, query: QueryAiOrganizationDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const input = await this.buildInput(principal, organizationId);
    const brief = await this.generateBrief(input);

    this.logger.debug({
      event: 'ai.daily_brief.generated',
      organizationId,
      input: {
        revenueToday: input.revenueToday,
        revenueYesterday: input.revenueYesterday,
        ordersToday: input.ordersToday,
        ordersYesterday: input.ordersYesterday,
        newCustomersToday: input.newCustomersToday,
        overallStatus: input.trust.overallStatus,
        freshnessStatus: input.trust.freshnessStatus,
        coverageStatus: input.trust.coverageStatus,
      },
      brief,
    });

    return buildSuccessResponse('AI daily brief retrieved successfully.', brief);
  }

  private async buildInput(principal: CurrentPrincipal, organizationId: string): Promise<DailyBriefInput> {
    const [metrics, signals, recommendationsResponse, trust] =
      await Promise.all([
        this.aiCommerceMetricsService.getCommerceOverviewMetrics(organizationId),
        this.aiSignalService.getCanonicalSignals(principal, { organizationId }),
        this.aiRecommendationService.listRecommendations(principal, { organizationId }),
        this.aiDataTrustService.getTrustForOrganization(organizationId),
      ]);

    return {
      revenueToday: metrics.totalRevenueToday,
      revenueYesterday: metrics.previous24h.revenue,
      ordersToday: metrics.totalOrdersToday,
      ordersYesterday: metrics.previous24h.orders,
      newCustomersToday: metrics.totalNewCustomersToday,
      newCustomersYesterday: metrics.previous24h.newCustomers,
      signals: (signals as CanonicalAiSignal[]).slice(0, 8).map((signal) => ({
        type: signal.type,
        severity: signal.severity,
        title: signal.title,
        summary: signal.summary,
        reason: signal.reason,
        recommendedNextStep: signal.recommendedNextStep,
      })),
      recommendations: (recommendationsResponse.data as Array<{
        priority: string;
        title: string;
        description: string;
        rationale: string;
      }>).slice(0, 6),
      trust,
    };
  }

  private async generateBrief(input: DailyBriefInput): Promise<DailyBriefPayload> {
    const insights = this.deriveInsights(input);
    const deterministic = this.buildDeterministicBrief(input, insights);
    const refinedSummary = await this.refineSummary(deterministic.summary);

    return {
      ...deterministic,
      summary: this.normalizeSummaryText(refinedSummary ?? deterministic.summary),
    };
  }

  private deriveInsights(input: DailyBriefInput): DerivedBriefInsights {
    const revenueChangeRatio = this.calculateChangeRatio(input.revenueToday, input.revenueYesterday);
    const orderChangeRatio = this.calculateChangeRatio(input.ordersToday, input.ordersYesterday);
    const customerChangeRatio = this.calculateChangeRatio(
      input.newCustomersToday,
      input.newCustomersYesterday,
    );
    const performanceStatus =
      (revenueChangeRatio !== null && revenueChangeRatio >= 0.15) ||
      (orderChangeRatio !== null && orderChangeRatio >= 0.15)
        ? 'growth'
        : (revenueChangeRatio !== null && revenueChangeRatio <= -0.15) ||
            (orderChangeRatio !== null && orderChangeRatio <= -0.15)
          ? 'decline'
          : 'stable';
    const customerActivityStatus =
      input.newCustomersToday > 0
        ? 'active'
        : input.ordersToday > 0 || input.revenueToday > 0
          ? 'quiet'
          : 'inactive';

    return {
      revenueChangeRatio,
      orderChangeRatio,
      customerChangeRatio,
      performanceStatus,
      customerActivityStatus,
      zeroActivity:
        input.revenueToday === 0 && input.ordersToday === 0 && input.newCustomersToday === 0,
      unusualRevenueShift:
        revenueChangeRatio !== null && Math.abs(revenueChangeRatio) >= 0.3,
      unusualOrderShift: orderChangeRatio !== null && Math.abs(orderChangeRatio) >= 0.3,
    };
  }

  private buildDeterministicBrief(
    input: DailyBriefInput,
    insights: DerivedBriefInsights,
  ): DailyBriefPayload {
    if (!input.trust.integrations.shopify.connected) {
      return {
        summary: 'Connect your store to enable insights.',
        signals: [],
        risks: ['Shopify is not connected, so commerce insight is unavailable.'],
        actions: ['Connect your Shopify store to start collecting commerce data.'],
      };
    }

    if (insights.zeroActivity) {
      return {
        summary: this.joinSentences(
          'No activity has been recorded yet today.',
          this.trustLimitationSentence(input),
        ),
        signals: ['No activity has been recorded yet today.'],
        risks: this.compactList([this.trustRiskSentence(input), ...input.trust.limitations.slice(0, 2)]),
        actions: this.compactList([
          this.integrationAction(input),
          'Check that store syncs are still running and data is arriving as expected.',
        ]).slice(0, 2),
      };
    }

    const summary = this.joinSentences(
      this.performanceSentence(input, insights),
      this.changeSentence(input, insights),
      this.trustLimitationSentence(input),
    );

    const signals = this.compactList([
      `Revenue today is ${this.formatCurrency(input.revenueToday)} versus ${this.formatCurrency(input.revenueYesterday)} yesterday${this.formatRatioSuffix(insights.revenueChangeRatio)}.`,
      `Orders today are ${input.ordersToday} versus ${input.ordersYesterday} yesterday${this.formatRatioSuffix(insights.orderChangeRatio)}.`,
      `New customers today: ${input.newCustomersToday}${this.formatRatioSuffix(insights.customerChangeRatio)}.`,
      ...input.signals
        .slice(0, 2)
        .map((signal) => signal.summary?.trim() || signal.title.trim()),
    ]).slice(0, 4);

    const risks = this.compactList([
      ...input.signals
        .filter((signal) => signal.severity === 'high' || signal.severity === 'critical')
        .slice(0, 2)
        .map((signal) => signal.reason?.trim() || signal.summary?.trim() || signal.title.trim()),
      this.trustRiskSentence(input),
      ...input.trust.limitations,
    ]).slice(0, 3);

    const actions = this.compactList([
      this.integrationAction(input),
      ...input.signals
        .filter((signal) => signal.severity === 'critical')
        .slice(0, 1)
        .map((signal) => signal.recommendedNextStep.trim()),
      ...input.recommendations
        .filter((recommendation) =>
          ['CRITICAL', 'HIGH', 'MEDIUM'].includes(recommendation.priority),
        )
        .slice(0, 2)
        .map((recommendation) => recommendation.title.trim()),
    ]).slice(0, 2);

    return {
      summary,
      signals,
      risks,
      actions,
    };
  }

  private performanceSentence(input: DailyBriefInput, insights: DerivedBriefInsights) {
    if (insights.performanceStatus === 'growth') {
      return `Performance is stronger today, with ${this.formatCurrency(input.revenueToday)} in revenue from ${input.ordersToday} orders so far.`;
    }

    if (insights.performanceStatus === 'decline') {
      return `Performance is softer today, with ${this.formatCurrency(input.revenueToday)} in revenue from ${input.ordersToday} orders so far.`;
    }

    return `Performance is stable today, with ${this.formatCurrency(input.revenueToday)} in revenue from ${input.ordersToday} orders so far.`;
  }

  private changeSentence(input: DailyBriefInput, insights: DerivedBriefInsights) {
    if (insights.unusualRevenueShift && insights.revenueChangeRatio !== null) {
      return `Revenue moved ${this.formatSignedPercent(insights.revenueChangeRatio)} versus yesterday.`;
    }

    if (insights.unusualOrderShift && insights.orderChangeRatio !== null) {
      return `Order volume moved ${this.formatSignedPercent(insights.orderChangeRatio)} versus yesterday.`;
    }

    if (insights.customerActivityStatus === 'active') {
      return `${input.newCustomersToday} new customer${input.newCustomersToday === 1 ? '' : 's'} have been recorded today.`;
    }

    if (insights.customerActivityStatus === 'quiet') {
      return 'Customer acquisition is quiet so far today.';
    }

    return 'No new customers have been recorded yet today.';
  }

  private trustLimitationSentence(input: DailyBriefInput) {
    if (input.trust.overallStatus === 'healthy') {
      return '';
    }

    return input.trust.recommendedOperatorMessage;
  }

  private trustRiskSentence(input: DailyBriefInput) {
    return input.trust.limitations[0] ?? '';
  }

  private integrationAction(input: DailyBriefInput) {
    if (!input.trust.integrations.shopify.connected) {
      return 'Connect your Shopify store to start receiving insights.';
    }

    if (input.trust.coverageStatus === 'partial' || input.trust.coverageStatus === 'minimal') {
      return 'Complete protected customer data approval to unlock full order and customer visibility.';
    }

    if (input.trust.shopifyStatus === 'failed' || input.trust.shopifyStatus === 'stale') {
      return 'Review the latest Shopify sync failure and rerun the store sync.';
    }

    if (input.trust.stripeStatus === 'not_connected') {
      return 'Connect Stripe to add payment, refund, and failure visibility.';
    }

    if (input.trust.stripeStatus === 'failed' || input.trust.stripeStatus === 'stale') {
      return 'Review the latest Stripe sync failure and refresh payment coverage.';
    }

    return '';
  }

  private async refineSummary(summary: string) {
    try {
      const response = await this.ollamaClientService.chatJson({
        model: 'qwen2.5:7b-instruct',
        messages: [
          {
            role: 'system',
            content:
              'You are an executive commerce analyst. Rewrite the following structured brief clearly and concisely. Do not add new information. Return JSON: {"summary":"..."}',
          },
          {
            role: 'user',
            content: JSON.stringify({ summary }),
          },
        ],
      });

      const parsed = JSON.parse(response.content) as { summary?: unknown };
      if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
        return null;
      }

      return this.joinSentences(parsed.summary.trim());
    } catch (error) {
      if (
        error instanceof GatewayTimeoutException ||
        error instanceof ServiceUnavailableException ||
        error instanceof BadGatewayException
      ) {
        this.logger.warn({
          event: 'ai.daily_brief.refine_skipped',
          reason: error.message,
        });
        return null;
      }

      this.logger.warn({
        event: 'ai.daily_brief.refine_skipped',
        reason: error instanceof Error ? error.message : 'Unknown daily brief refinement failure',
      });
      return null;
    }
  }

  private compactList(values: Array<string | null | undefined>) {
    const deduped = new Set<string>();

    return values
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .filter((value) => {
        const normalized = value.toLowerCase().replace(/\s+/g, ' ').trim();
        if (!normalized || deduped.has(normalized)) {
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

  private normalizeSummaryText(summary: string) {
    const sentenceCandidates = summary
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    if (sentenceCandidates.length === 0) {
      return summary.trim();
    }

    return this.joinSentences(...sentenceCandidates);
  }

  private calculateChangeRatio(current: number, previous: number) {
    if (previous === 0) {
      return current > 0 ? 1 : null;
    }

    return (current - previous) / previous;
  }

  private formatRatioSuffix(value: number | null) {
    if (value === null) {
      return '';
    }

    return ` (${this.formatSignedPercent(value)})`;
  }

  private formatSignedPercent(value: number) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(0)}%`;
  }

  private formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
