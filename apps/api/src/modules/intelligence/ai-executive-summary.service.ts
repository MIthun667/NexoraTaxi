import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { CrmCustomerIntelligenceService } from '../crm/crm-customer-intelligence.service';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { AiInsightService } from './ai-insight.service';
import { AiLlmSummaryService } from './ai-llm-summary.service';
import { AiRecommendationService } from './ai-recommendation.service';
import { AiSignalService } from './ai-signal.service';
import { AiSummaryService } from './ai-summary.service';
import { GenerateAiExecutiveSummaryDto } from './dto/generate-ai-executive-summary.dto';
import { QueryAiOrganizationDto } from './dto/query-ai-organization.dto';
import type { ExecutiveSummaryOutput } from './schemas/executive-summary.schema';

type ExecutiveSummaryRecord = {
  id: string;
  organizationId: string;
  date: Date;
  summary: string;
  highlights: Prisma.JsonValue | null;
  risks: Prisma.JsonValue | null;
  recommendations: Prisma.JsonValue | null;
  sourceType: string;
  modelName: string | null;
  status: string;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AiExecutiveSummaryService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiSummaryService: AiSummaryService,
    private readonly aiSignalService: AiSignalService,
    private readonly aiInsightService: AiInsightService,
    private readonly aiRecommendationService: AiRecommendationService,
    private readonly crmCustomerIntelligenceService: CrmCustomerIntelligenceService,
    private readonly aiLlmSummaryService: AiLlmSummaryService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async getTodayExecutiveSummary(
    principal: CurrentPrincipal,
    query: QueryAiOrganizationDto,
  ) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const summary = await this.ensureExecutiveSummary(principal, organizationId, false);

    return buildSuccessResponse(
      'AI executive summary retrieved successfully.',
      summary,
    );
  }

  async generateExecutiveSummary(
    principal: CurrentPrincipal,
    dto: GenerateAiExecutiveSummaryDto,
  ) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );
    const summary = await this.ensureExecutiveSummary(principal, organizationId, true);

    return buildSuccessResponse(
      'AI executive summary generated successfully.',
      summary,
    );
  }

  private async ensureExecutiveSummary(
    principal: CurrentPrincipal,
    organizationId: string,
    forceRefresh: boolean,
  ) {
    const today = this.startOfDay(new Date());

    if (!forceRefresh) {
      const existing = await this.prismaService.aiExecutiveSummary.findUnique({
        where: {
          organizationId_date: {
            organizationId,
            date: today,
          },
        },
      });

      if (existing) {
        return existing;
      }
    }

    const context = await this.buildContext(principal, organizationId);

    try {
      const generated = await this.aiLlmSummaryService.generateExecutiveSummary({
        organizationId,
        actorUserId: principal.userId,
        context,
      });

      return await this.persistExecutiveSummary({
        organizationId,
        date: today,
        summary: generated.summary,
        highlights: generated.highlights,
        risks: generated.risks,
        recommendations: generated.leadershipFocus,
        sourceType: 'llm_grounded',
        modelName: this.configService.get<string>(
          'environment.ollamaModel',
          'qwen2.5:7b-instruct',
        ),
        status: 'SUCCEEDED',
        metadata: {
          fallbackUsed: false,
          activeSignalCount: context.activeSignals.length,
          recommendationCount: context.activeRecommendations.length,
        } as Prisma.InputJsonValue,
      });
    } catch (error) {
      const fallback = this.buildDeterministicFallback(context);

      this.logger.warn({
        event: 'ai.executive_summary.fallback_used',
        organizationId,
        reason: error instanceof Error ? error.message : 'Unknown executive summary failure',
      });

      return await this.persistExecutiveSummary({
        organizationId,
        date: today,
        summary: fallback.summary,
        highlights: fallback.highlights,
        risks: fallback.risks,
        recommendations: fallback.leadershipFocus,
        sourceType: 'deterministic_fallback',
        modelName: null,
        status:
          error instanceof GatewayTimeoutException ||
          error instanceof ServiceUnavailableException ||
          error instanceof BadGatewayException
            ? 'FALLBACK'
            : 'FALLBACK',
        metadata: {
          fallbackUsed: true,
          fallbackReason: error instanceof Error ? error.message : 'Unknown executive summary failure',
          activeSignalCount: context.activeSignals.length,
          recommendationCount: context.activeRecommendations.length,
        } as Prisma.InputJsonValue,
      });
    }
  }

  private async buildContext(principal: CurrentPrincipal, organizationId: string) {
    const [dailySummaryResponse, signalsResponse, insightsResponse, recommendationsResponse, customerMetrics] =
      await Promise.all([
        this.aiSummaryService.getTodaySummary(principal, { organizationId }),
        this.aiSignalService.listSignals(principal, { organizationId }),
        this.aiInsightService.listInsights(principal, { organizationId }),
        this.aiRecommendationService.listRecommendations(principal, { organizationId }),
        this.crmCustomerIntelligenceService.getCustomerHealthMetrics(organizationId),
      ]);

    const dailySummary = dailySummaryResponse.data as {
      summary: string;
      metrics: Prisma.JsonValue;
      createdAt: Date;
    };
    const metrics = this.parseSummaryMetrics(dailySummary.metrics);

    return {
      organizationId,
      generatedAt: new Date().toISOString(),
      deterministicDailySummary: {
        summary: dailySummary.summary,
        createdAt: dailySummary.createdAt.toISOString(),
        metrics,
      },
      activeSignals: (signalsResponse.data as Array<{
        type: string;
        severity: string;
        title: string;
        description: string;
      }>).slice(0, 6),
      recentInsights: (insightsResponse.data as Array<{
        category: string;
        summary: string;
        explanation: string;
      }>).slice(0, 4),
      activeRecommendations: (recommendationsResponse.data as Array<{
        category: string;
        priority: string;
        title: string;
        description: string;
        rationale: string;
      }>).slice(0, 5),
      topProduct: metrics.topProduct ?? null,
      stripeFinance: {
        connected: metrics.stripeConnected,
        revenueToday: metrics.stripeRevenueToday,
        current24hRevenue: metrics.stripeCurrent24hRevenue,
        previous24hRevenue: metrics.stripePrevious24hRevenue,
        failedPaymentsCurrent24h: metrics.stripeFailedPaymentsCurrent24h,
        refundsCurrent24h: metrics.stripeRefundsCurrent24h,
        disputesCurrent24h: metrics.stripeDisputesCurrent24h,
      },
      customerIntelligence: {
        highValueCustomers: customerMetrics.highValueCustomers,
        atRiskCustomers: customerMetrics.atRiskCustomers,
        dormantCustomers: customerMetrics.dormantCustomers,
        highValueAtRiskCustomers: customerMetrics.highValueAtRiskCustomers,
        topCustomerRevenueShare: customerMetrics.topCustomerRevenueShare,
        repeatCustomerShareCurrent: customerMetrics.repeatCustomerShareCurrent,
        repeatCustomerSharePrevious: customerMetrics.repeatCustomerSharePrevious,
        retentionPressure: customerMetrics.retentionPressure,
      },
    };
  }

  private parseSummaryMetrics(metricsValue: Prisma.JsonValue) {
    const metrics =
      metricsValue && typeof metricsValue === 'object' && !Array.isArray(metricsValue)
        ? (metricsValue as Record<string, unknown>)
        : {};
    const topProductValue =
      metrics.topProduct && typeof metrics.topProduct === 'object' && !Array.isArray(metrics.topProduct)
        ? (metrics.topProduct as Record<string, unknown>)
        : null;

    return {
      totalRevenue: Number(metrics.totalRevenue ?? 0),
      totalOrders: Number(metrics.totalOrders ?? 0),
      newCustomers: Number(metrics.newCustomers ?? 0),
      keySignalsCount: Number(metrics.keySignalsCount ?? 0),
      highSeveritySignalsCount: Number(metrics.highSeveritySignalsCount ?? 0),
      refundTelemetryAvailable: Boolean(metrics.refundTelemetryAvailable),
      stripeConnected: Boolean(metrics.stripeConnected),
      stripeRevenueToday: Number(metrics.stripeRevenueToday ?? 0),
      stripeCurrent24hRevenue: Number(metrics.stripeCurrent24hRevenue ?? 0),
      stripePrevious24hRevenue: Number(metrics.stripePrevious24hRevenue ?? 0),
      stripeFailedPaymentsCurrent24h: Number(metrics.stripeFailedPaymentsCurrent24h ?? 0),
      stripeFailedPaymentsPrevious24h: Number(metrics.stripeFailedPaymentsPrevious24h ?? 0),
      stripeRefundsCurrent24h: Number(metrics.stripeRefundsCurrent24h ?? 0),
      stripeDisputesCurrent24h: Number(metrics.stripeDisputesCurrent24h ?? 0),
      stripeSuccessfulChargesCurrent24h: Number(metrics.stripeSuccessfulChargesCurrent24h ?? 0),
      stripeSuccessfulChargesPrevious24h: Number(metrics.stripeSuccessfulChargesPrevious24h ?? 0),
      shopifyDataCoverage:
        typeof metrics.shopifyDataCoverage === 'string' ? metrics.shopifyDataCoverage : 'NONE',
      shopifyLimitedAccess: Boolean(metrics.shopifyLimitedAccess),
      protectedCustomerDataRequired: Boolean(metrics.protectedCustomerDataRequired),
      highValueCustomers: Number(metrics.highValueCustomers ?? 0),
      atRiskCustomers: Number(metrics.atRiskCustomers ?? 0),
      dormantCustomers: Number(metrics.dormantCustomers ?? 0),
      repeatCustomers: Number(metrics.repeatCustomers ?? 0),
      highValueAtRiskCustomers: Number(metrics.highValueAtRiskCustomers ?? 0),
      topCustomerRevenueShare: Number(metrics.topCustomerRevenueShare ?? 0),
      repeatCustomerShareCurrent:
        metrics.repeatCustomerShareCurrent === null || metrics.repeatCustomerShareCurrent === undefined
          ? null
          : Number(metrics.repeatCustomerShareCurrent),
      repeatCustomerSharePrevious:
        metrics.repeatCustomerSharePrevious === null || metrics.repeatCustomerSharePrevious === undefined
          ? null
          : Number(metrics.repeatCustomerSharePrevious),
      retentionPressure:
        typeof metrics.retentionPressure === 'string' ? metrics.retentionPressure : 'LOW',
      topProduct: topProductValue
        ? {
            productId:
              typeof topProductValue.productId === 'string' ? topProductValue.productId : null,
            title: String(topProductValue.title ?? 'Top product'),
            revenue: Number(topProductValue.revenue ?? 0),
            unitsSold: Number(topProductValue.unitsSold ?? 0),
          }
        : null,
    };
  }

  private buildDeterministicFallback(context: Awaited<ReturnType<AiExecutiveSummaryService['buildContext']>>): ExecutiveSummaryOutput {
    const topRecommendation = context.activeRecommendations[0];
    const topSignal = context.activeSignals[0];
    const topRiskCount = context.activeSignals.filter(
      (signal) => signal.severity === 'high' || signal.severity === 'critical',
    ).length;

    if (context.deterministicDailySummary.metrics.shopifyLimitedAccess) {
      return {
        summary:
          'Shopify is connected, but executive coverage is intentionally limited. Nexora can confirm product connectivity and any connected finance signals, while order and customer conclusions are deferred until Shopify protected customer data approval is granted.',
        highlights: [
          'Product catalog sync completed successfully.',
          context.stripeFinance.connected
            ? `Stripe remains connected with ${context.stripeFinance.failedPaymentsCurrent24h} failed payment${context.stripeFinance.failedPaymentsCurrent24h === 1 ? '' : 's'} in the latest 24-hour window.`
            : 'Stripe finance visibility is not connected yet.',
          `${context.activeSignals.length} active AI signal${context.activeSignals.length === 1 ? '' : 's'} remain in view with limited Shopify coverage.`,
        ],
        risks: [
          'Order and customer intelligence are constrained until Shopify protected customer data access is approved.',
        ],
        leadershipFocus: [
          'Complete Shopify protected customer data approval to unlock revenue, order, and customer intelligence.',
        ],
      };
    }

    return {
      summary:
        topRiskCount > 0
          ? `Commercial performance needs attention today. ${context.deterministicDailySummary.summary} Leadership should focus first on ${topRecommendation?.title?.toLowerCase() ?? 'the highest-priority active signal'}.`
          : `Commercial performance is stable today. ${context.deterministicDailySummary.summary} Leadership should stay focused on preserving current demand momentum and closing any visibility gaps.`,
      highlights: [
        `${context.deterministicDailySummary.metrics.totalOrders} orders generated ${this.formatCurrency(context.deterministicDailySummary.metrics.totalRevenue)} today.`,
        context.deterministicDailySummary.metrics.newCustomers > 0
          ? `${context.deterministicDailySummary.metrics.newCustomers} new customers were added today.`
          : 'No new customers have been recorded yet today.',
        context.topProduct
          ? `${context.topProduct.title} is the current top product by revenue.`
          : 'No top-product concentration has been identified yet.',
      ].slice(0, 3),
      risks: topSignal
        ? context.activeSignals.slice(0, 3).map((signal) => signal.title)
        : ['No high-signal commercial risks are active right now.'],
      leadershipFocus: topRecommendation
        ? context.activeRecommendations.slice(0, 3).map((recommendation) => recommendation.title)
        : ['Maintain daily review of revenue, customer acquisition, and product concentration.'],
    };
  }

  private async persistExecutiveSummary(input: {
    organizationId: string;
    date: Date;
    summary: string;
    highlights: string[];
    risks: string[];
    recommendations: string[];
    sourceType: string;
    modelName: string | null;
    status: string;
    metadata: Prisma.InputJsonValue;
  }): Promise<ExecutiveSummaryRecord> {
    return this.prismaService.aiExecutiveSummary.upsert({
      where: {
        organizationId_date: {
          organizationId: input.organizationId,
          date: input.date,
        },
      },
      update: {
        summary: input.summary,
        highlights: input.highlights as Prisma.InputJsonValue,
        risks: input.risks as Prisma.InputJsonValue,
        recommendations: input.recommendations as Prisma.InputJsonValue,
        sourceType: input.sourceType,
        modelName: input.modelName,
        status: input.status,
        metadata: input.metadata,
      },
      create: {
        organizationId: input.organizationId,
        date: input.date,
        summary: input.summary,
        highlights: input.highlights as Prisma.InputJsonValue,
        risks: input.risks as Prisma.InputJsonValue,
        recommendations: input.recommendations as Prisma.InputJsonValue,
        sourceType: input.sourceType,
        modelName: input.modelName,
        status: input.status,
        metadata: input.metadata,
      },
    });
  }

  private startOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }
}
