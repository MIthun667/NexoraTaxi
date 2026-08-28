import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { CrmCustomerIntelligenceService } from '../crm/crm-customer-intelligence.service';
import { QueryAiOrganizationDto } from './dto/query-ai-organization.dto';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { AiSignalService, CanonicalAiSignal } from './ai-signal.service';

type InsightDraft = {
  category: string;
  summary: string;
  explanation: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AiInsightService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly crmCustomerIntelligenceService: CrmCustomerIntelligenceService,
    private readonly aiSignalService: AiSignalService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async listInsights(principal: CurrentPrincipal, query: QueryAiOrganizationDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );

    const [signalsResponse, metrics, customerMetrics] = await Promise.all([
      this.aiSignalService.listSignals(principal, { organizationId }),
      this.aiCommerceMetricsService.getCommerceOverviewMetrics(organizationId),
      this.crmCustomerIntelligenceService.getCustomerHealthMetrics(organizationId),
    ]);

    const insights = this.buildInsights(
      organizationId,
      signalsResponse.data as CanonicalAiSignal[],
      metrics,
      customerMetrics,
    );

    const persistedInsights = await this.persistInsights(organizationId, insights);
    return buildSuccessResponse('AI insights retrieved successfully.', persistedInsights);
  }

  private buildInsights(
    organizationId: string,
    signals: CanonicalAiSignal[],
    metrics: Awaited<ReturnType<AiCommerceMetricsService['getCommerceOverviewMetrics']>>,
    customerMetrics: Awaited<ReturnType<CrmCustomerIntelligenceService['getCustomerHealthMetrics']>>,
  ) {
    const insights: InsightDraft[] = [];
    const revenueSignal = signals.find((signal) => signal.type === 'revenue_drop');
    const orderSignal = signals.find((signal) => signal.type === 'order_slowdown');
    const inactivitySignal = signals.find((signal) => signal.type === 'customer_slowdown');
    const topProductSignal = signals.find((signal) => signal.type === 'product_concentration_risk');
    const paymentFailureSignal = signals.find(
      (signal) => signal.type === 'payment_visibility_gap' || signal.type === 'unusual_change',
    );
    const retentionSignal = signals.find((signal) => signal.type === 'customer_slowdown');
    const concentrationSignal = signals.find((signal) => signal.type === 'product_concentration_risk');

    if (revenueSignal || orderSignal) {
      const repeatCustomerContext =
        metrics.current24h.repeatCustomers < metrics.previous24h.repeatCustomers
          ? 'Repeat-customer demand also softened during the same window.'
          : 'Repeat-customer participation held steady, which suggests the slowdown was driven primarily by order acquisition volume.';

      insights.push({
        category: 'revenue-performance',
        summary: 'Revenue is being driven by order volume pressure.',
        explanation: `Revenue in the last 24 hours is ${this.formatCurrency(metrics.current24h.revenue)} across ${metrics.current24h.orders} orders. The prior 24-hour window delivered ${this.formatCurrency(metrics.previous24h.revenue)} across ${metrics.previous24h.orders} orders. ${repeatCustomerContext}`,
        metadata: {
          signalTypes: signals
            .filter((signal) => ['revenue_drop', 'order_slowdown'].includes(signal.type))
            .map((signal) => signal.type),
          currentRevenue: metrics.current24h.revenue,
          previousRevenue: metrics.previous24h.revenue,
          currentOrders: metrics.current24h.orders,
          previousOrders: metrics.previous24h.orders,
        } as Prisma.InputJsonValue,
      });
    }

    if (inactivitySignal) {
      insights.push({
        category: 'customer-acquisition',
        summary: 'Customer acquisition momentum is weak.',
        explanation: `Nexora has not observed a new customer event recently enough to sustain normal acquisition pace. Current 24-hour customer adds are ${metrics.current24h.newCustomers}, versus ${metrics.previous24h.newCustomers} in the prior period.`,
        metadata: {
          currentNewCustomers: metrics.current24h.newCustomers,
          previousNewCustomers: metrics.previous24h.newCustomers,
          lastCustomerSeenAt: metrics.lastCustomerSeenAt,
        } as Prisma.InputJsonValue,
      });
    }

    if (topProductSignal && metrics.topProduct) {
      insights.push({
        category: 'product-performance',
        summary: `${metrics.topProduct.title} is the current product leader.`,
        explanation: `${metrics.topProduct.title} generated ${this.formatCurrency(metrics.topProduct.revenue)} in the recent 30-day window and is currently the strongest product-level revenue contributor in Nexora's Shopify data.`,
        metadata: {
          productId: metrics.topProduct.productId,
          revenue: metrics.topProduct.revenue,
          unitsSold: metrics.topProduct.unitsSold,
        } as Prisma.InputJsonValue,
      });
    }

    if (paymentFailureSignal) {
      insights.push({
        category: 'payment-health',
        summary: 'Finance-side payment health is affecting commercial confidence.',
        explanation: `Stripe visibility is now contributing to the commerce picture. Confirmed Stripe revenue for the last 24 hours is ${this.formatCurrency(metrics.stripeCurrent24hRevenue)}. Failed payments: ${metrics.stripeFailedPaymentsCurrent24h}. Refunds: ${metrics.stripeRefundsCurrent24h}. Disputes: ${metrics.stripeDisputesCurrent24h}.`,
        metadata: {
          stripeConnected: metrics.stripeConnected,
          stripeCurrent24hRevenue: metrics.stripeCurrent24hRevenue,
          stripeFailedPaymentsCurrent24h: metrics.stripeFailedPaymentsCurrent24h,
          stripeRefundsCurrent24h: metrics.stripeRefundsCurrent24h,
          stripeDisputesCurrent24h: metrics.stripeDisputesCurrent24h,
        } as Prisma.InputJsonValue,
      });
    }

    if (retentionSignal || concentrationSignal) {
      insights.push({
        category: 'customer-health',
        summary: 'Customer quality and retention pressure need attention.',
        explanation: `Nexora is currently tracking ${customerMetrics.highValueCustomers} high-value customers, ${customerMetrics.atRiskCustomers} at-risk customers, and ${customerMetrics.dormantCustomers} dormant customers. The top five customers represent ${this.formatPercent(customerMetrics.topCustomerRevenueShare)} of tracked customer revenue, and retention pressure is currently ${customerMetrics.retentionPressure.toLowerCase()}.`,
        metadata: {
          highValueCustomers: customerMetrics.highValueCustomers,
          atRiskCustomers: customerMetrics.atRiskCustomers,
          dormantCustomers: customerMetrics.dormantCustomers,
          topCustomerRevenueShare: customerMetrics.topCustomerRevenueShare,
          retentionPressure: customerMetrics.retentionPressure,
        } as Prisma.InputJsonValue,
      });
    }

    insights.push({
      category: 'risk-posture',
      summary:
        signals.filter((signal) => signal.severity === 'high' || signal.severity === 'critical').length > 0
          ? 'High-severity commercial risks are active.'
          : 'Commercial risk posture is stable but still monitored.',
      explanation: `Nexora currently has ${signals.length} active Shopify intelligence signals, including ${signals.filter((signal) => signal.severity === 'high' || signal.severity === 'critical').length} high-severity items.`,
      metadata: {
        organizationId,
        activeSignals: signals.length,
        highSeveritySignals: signals.filter(
          (signal) => signal.severity === 'high' || signal.severity === 'critical',
        ).length,
      } as Prisma.InputJsonValue,
    });

    return insights;
  }

  private async persistInsights(organizationId: string, insights: InsightDraft[]) {
    const persisted: Array<{
      id: string;
      organizationId: string;
      category: string;
      summary: string;
      explanation: string;
      metadata: Prisma.JsonValue | null;
      createdAt: Date;
    }> = [];

    for (const insight of insights) {
      const existing = await this.prismaService.aiInsight.findFirst({
        where: {
          organizationId,
          category: insight.category,
          summary: insight.summary,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        persisted.push(existing);
        continue;
      }

      const created = await this.prismaService.aiInsight.create({
        data: {
          organizationId,
          category: insight.category,
          summary: insight.summary,
          explanation: insight.explanation,
          metadata: insight.metadata ?? Prisma.JsonNull,
        },
      });
      persisted.push(created);
    }

    this.logger.debug({
      event: 'ai.insights.generated',
      organizationId,
      insightCount: persisted.length,
      categories: persisted.map((insight) => insight.category),
    });

    return persisted.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  private formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatPercent(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
