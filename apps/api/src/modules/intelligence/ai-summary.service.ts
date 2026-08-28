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

@Injectable()
export class AiSummaryService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly crmCustomerIntelligenceService: CrmCustomerIntelligenceService,
    private readonly aiSignalService: AiSignalService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async getTodaySummary(principal: CurrentPrincipal, query: QueryAiOrganizationDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );

    const [signalsResponse, metrics, customerMetrics] = await Promise.all([
      this.aiSignalService.listSignals(principal, { organizationId }),
      this.aiCommerceMetricsService.getCommerceOverviewMetrics(organizationId),
      this.crmCustomerIntelligenceService.getCustomerHealthMetrics(organizationId),
    ]);

    const activeSignals = signalsResponse.data as CanonicalAiSignal[];
    const today = this.startOfDay(new Date());
    const summary = this.buildSummary(metrics, customerMetrics, activeSignals);
    const metricsPayload = {
      totalRevenue: metrics.totalRevenueToday,
      totalOrders: metrics.totalOrdersToday,
      newCustomers: metrics.totalNewCustomersToday,
      keySignalsCount: activeSignals.length,
      highSeveritySignalsCount: activeSignals.filter(
        (signal) => signal.severity === 'high' || signal.severity === 'critical',
      ).length,
      topProduct: metrics.topProduct,
      refundTelemetryAvailable: metrics.refundTelemetryAvailable,
      stripeConnected: metrics.stripeConnected,
      stripeRevenueToday: metrics.stripeRevenueToday,
      stripeCurrent24hRevenue: metrics.stripeCurrent24hRevenue,
      stripePrevious24hRevenue: metrics.stripePrevious24hRevenue,
      stripeFailedPaymentsCurrent24h: metrics.stripeFailedPaymentsCurrent24h,
      stripeFailedPaymentsPrevious24h: metrics.stripeFailedPaymentsPrevious24h,
      stripeRefundsCurrent24h: metrics.stripeRefundsCurrent24h,
      stripeDisputesCurrent24h: metrics.stripeDisputesCurrent24h,
      stripeSuccessfulChargesCurrent24h: metrics.stripeSuccessfulChargesCurrent24h,
      stripeSuccessfulChargesPrevious24h: metrics.stripeSuccessfulChargesPrevious24h,
      shopifyDataCoverage: metrics.shopifyDataCoverage,
      shopifyLimitedAccess: metrics.shopifyLimitedAccess,
      protectedCustomerDataRequired: metrics.protectedCustomerDataRequired,
      highValueCustomers: customerMetrics.highValueCustomers,
      atRiskCustomers: customerMetrics.atRiskCustomers,
      dormantCustomers: customerMetrics.dormantCustomers,
      repeatCustomers: customerMetrics.repeatCustomers,
      highValueAtRiskCustomers: customerMetrics.highValueAtRiskCustomers,
      topCustomerRevenueShare: customerMetrics.topCustomerRevenueShare,
      repeatCustomerShareCurrent: customerMetrics.repeatCustomerShareCurrent,
      repeatCustomerSharePrevious: customerMetrics.repeatCustomerSharePrevious,
      retentionPressure: customerMetrics.retentionPressure,
    };

    const record = await this.prismaService.aiDailySummary.upsert({
      where: {
        organizationId_date: {
          organizationId,
          date: today,
        },
      },
      update: {
        summary,
        metrics: metricsPayload as Prisma.InputJsonValue,
      },
      create: {
        organizationId,
        date: today,
        summary,
        metrics: metricsPayload as Prisma.InputJsonValue,
      },
    });

    this.logger.debug({
      event: 'ai.daily_summary.generated',
      organizationId,
      date: today.toISOString(),
      keySignalsCount: activeSignals.length,
    });

    return buildSuccessResponse('AI daily summary retrieved successfully.', record);
  }

  private buildSummary(
    metrics: Awaited<ReturnType<AiCommerceMetricsService['getCommerceOverviewMetrics']>>,
    customerMetrics: Awaited<ReturnType<CrmCustomerIntelligenceService['getCustomerHealthMetrics']>>,
    activeSignals: Array<{ severity: string; type: string }>,
  ) {
    if (metrics.shopifyLimitedAccess) {
      const financeSummary = metrics.stripeConnected
        ? `Stripe remains connected and confirms ${this.formatCurrency(metrics.stripeRevenueToday)} in revenue today.`
        : 'Stripe payment visibility is not connected yet.';

      return `Shopify connection is active, but data coverage is limited. Products synced successfully while Shopify is still restricting order and customer access until protected customer data approval is granted. ${financeSummary} Nexora is suppressing order and retention conclusions until broader Shopify access is available.`;
    }

    const pressureSummary =
      activeSignals.some((signal) => signal.type === 'revenue_drop') ||
      activeSignals.some((signal) => signal.type === 'order_slowdown')
        ? 'Commercial momentum is under pressure.'
        : 'Commercial performance is stable.';

    const customerSummary =
      metrics.totalNewCustomersToday > 0
        ? `${metrics.totalNewCustomersToday} new customers were captured today.`
        : 'No new customers have been recorded yet today.';

    const financeSummary = metrics.stripeConnected
      ? `Stripe confirms ${this.formatCurrency(metrics.stripeRevenueToday)} in revenue today with ${metrics.stripeFailedPaymentsCurrent24h} failed payment${metrics.stripeFailedPaymentsCurrent24h === 1 ? '' : 's'} in the latest 24-hour window.`
      : 'Stripe payment visibility is not connected yet.';
    const retentionSummary =
      customerMetrics.highValueAtRiskCustomers > 0
        ? `${customerMetrics.highValueAtRiskCustomers} high-value customer${customerMetrics.highValueAtRiskCustomers === 1 ? '' : 's'} require retention attention.`
        : customerMetrics.retentionPressure !== 'LOW'
          ? `${customerMetrics.atRiskCustomers} customers are currently at risk and retention pressure is ${customerMetrics.retentionPressure.toLowerCase()}.`
          : 'Customer retention posture is stable.';

    return `${pressureSummary} ${metrics.totalOrdersToday} orders produced ${this.formatCurrency(metrics.totalRevenueToday)} in Shopify revenue today. ${customerSummary} ${financeSummary} ${retentionSummary} ${activeSignals.length} active AI signals are being monitored.`;
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
