import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { CommerceAgentOrchestrationService } from '../agents/commerce-agent-orchestration.service';
import { CrmCustomerIntelligenceService, CustomerHealthMetrics } from '../crm/crm-customer-intelligence.service';
import { AiDataTrustService, CanonicalDataTrustStatus } from './ai-data-trust.service';
import { AiNotificationService } from './ai-notification.service';
import { AiCommerceMetricsService, CommerceOverviewMetrics } from './ai-commerce-metrics.service';
import { QueryAiSignalsDto } from './dto/query-ai-signals.dto';
import { RefreshAiSignalsDto } from './dto/refresh-ai-signals.dto';

export type SignalSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SignalConfidence = 'low' | 'medium' | 'high';
export type SignalFreshnessStatus = 'fresh' | 'delayed' | 'stale';
export type SignalAffectedArea =
  | 'revenue'
  | 'orders'
  | 'customers'
  | 'products'
  | 'integrations'
  | 'payments'
  | 'data_quality';

export type CanonicalAiSignal = {
  id: string;
  organizationId: string;
  type: string;
  title: string;
  summary: string;
  description: string;
  reason: string;
  severity: SignalSeverity;
  confidence: SignalConfidence;
  freshnessStatus: SignalFreshnessStatus;
  affectedArea: SignalAffectedArea;
  evidence: string[];
  recommendedNextStep: string;
  metadata?: Record<string, unknown> | null;
  detectedAt: string;
  updatedAt: string;
  createdAt: string;
  isActive: boolean;
};

type SignalContext = {
  metrics: CommerceOverviewMetrics;
  customerMetrics: CustomerHealthMetrics;
  store: {
    id: string;
    shopDomain: string;
  } | null;
  latestStoreSyncRun: {
    id: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
  } | null;
  stripeAccount: {
    id: string;
  } | null;
  latestStripeSyncRun: {
    id: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
  } | null;
  trust: CanonicalDataTrustStatus;
};

type SignalDraft = {
  type: string;
  title: string;
  summary: string;
  reason: string;
  severity: SignalSeverity;
  confidence: SignalConfidence;
  freshnessStatus: SignalFreshnessStatus;
  affectedArea: SignalAffectedArea;
  evidence: string[];
  recommendedNextStep: string;
  dedupeKey: string;
  fingerprint: string;
  metadata?: Prisma.InputJsonValue;
};

const MANAGED_SIGNAL_TYPES = [
  'revenue_drop',
  'order_slowdown',
  'customer_slowdown',
  'product_concentration_risk',
  'sync_issue',
  'payment_visibility_gap',
  'data_coverage_limit',
  'demand_spike',
  'unusual_change',
  'order_volume_drop',
  'customer_inactivity',
  'top_product',
  'conversion_pressure',
  'refund_monitoring_pending',
  'payment_failure_increase',
  'refund_activity_detected',
  'dispute_activity_detected',
  'stripe_revenue_drop',
  'revenue_alignment_gap',
  'repeat_customer_decline',
  'high_value_customer_inactivity',
  'dormant_customer_increase',
  'customer_concentration_risk',
  'retention_pressure',
] as const;

@Injectable()
export class AiSignalService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiDataTrustService: AiDataTrustService,
    private readonly crmCustomerIntelligenceService: CrmCustomerIntelligenceService,
    private readonly aiNotificationService: AiNotificationService,
    @Inject(forwardRef(() => CommerceAgentOrchestrationService))
    private readonly commerceAgentOrchestrationService: CommerceAgentOrchestrationService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async listSignals(principal: CurrentPrincipal, query: QueryAiSignalsDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const signals = await this.ensureSignals(principal, organizationId, false);
    const filteredSignals = this.applyFilters(signals, query);

    return buildSuccessResponse('AI signals retrieved successfully.', filteredSignals);
  }

  async refreshSignals(principal: CurrentPrincipal, dto: RefreshAiSignalsDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );
    const signals = await this.ensureSignals(principal, organizationId, true);
    await this.commerceAgentOrchestrationService.emitSignalTriggers(
      principal,
      organizationId,
      signals,
    );

    return buildSuccessResponse('AI signals refreshed successfully.', signals);
  }

  async getSignalById(principal: CurrentPrincipal, signalId: string, query: QueryAiSignalsDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const signals = await this.ensureSignals(principal, organizationId, false);
    const signal = signals.find((candidate) => candidate.id === signalId);

    if (!signal) {
      throw new NotFoundException('Signal could not be found.');
    }

    return buildSuccessResponse('AI signal retrieved successfully.', signal);
  }

  async getCanonicalSignals(
    principal: CurrentPrincipal,
    query: QueryAiSignalsDto,
    options?: { forceRefresh?: boolean },
  ) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );

    return this.ensureSignals(principal, organizationId, options?.forceRefresh ?? false);
  }

  private async ensureSignals(
    principal: CurrentPrincipal,
    organizationId: string,
    forceRefresh: boolean,
  ) {
    const context = await this.buildSignalContext(organizationId);
    const drafts = this.rankSignals(this.dedupeSignals(this.buildSignals(context)));
    const persistedSignals = await this.persistSignals(organizationId, drafts, forceRefresh);

    this.logger.debug({
      event: 'ai.signals.generated',
      organizationId,
      signalCount: persistedSignals.length,
      signalTypes: persistedSignals.map((signal) => signal.type),
    });

    return persistedSignals;
  }

  private async buildSignalContext(organizationId: string): Promise<SignalContext> {
    const [metrics, customerMetrics, store, latestStoreSyncRun, stripeAccount, latestStripeSyncRun, trust] =
      await Promise.all([
        this.aiCommerceMetricsService.getCommerceOverviewMetrics(organizationId),
        this.crmCustomerIntelligenceService.getCustomerHealthMetrics(organizationId),
        this.prismaService.integrationShopifyStore.findFirst({
          where: { organizationId, isActive: true },
          orderBy: { installedAt: 'desc' },
          select: { id: true, shopDomain: true },
        }),
        this.prismaService.shopifySyncRun.findFirst({
          where: { organizationId },
          orderBy: { startedAt: 'desc' },
          select: { id: true, status: true, startedAt: true, completedAt: true },
        }),
        this.prismaService.integrationStripeAccount.findFirst({
          where: { organizationId, isActive: true },
          orderBy: { connectedAt: 'desc' },
          select: { id: true },
        }),
        this.prismaService.stripeSyncRun.findFirst({
          where: { organizationId },
          orderBy: { startedAt: 'desc' },
          select: { id: true, status: true, startedAt: true, completedAt: true },
        }),
        this.aiDataTrustService.getTrustForOrganization(organizationId),
      ]);

    return {
      metrics,
      customerMetrics,
      store,
      latestStoreSyncRun,
      stripeAccount,
      latestStripeSyncRun,
      trust,
    };
  }

  private buildSignals(context: SignalContext) {
    const { metrics, customerMetrics, latestStoreSyncRun, latestStripeSyncRun, stripeAccount, trust } = context;
    const signals: SignalDraft[] = [];

    const revenueChangeRatio = metrics.changes.revenueChangeRatio;
    const orderChangeRatio = metrics.changes.orderChangeRatio;
    const newCustomerChangeRatio = metrics.changes.newCustomerChangeRatio;
    const hoursSinceLastCustomer =
      metrics.lastCustomerSeenAt === null
        ? null
        : (Date.now() - new Date(metrics.lastCustomerSeenAt).getTime()) / (60 * 60 * 1000);
    const baseFreshness = this.mergeFreshnessStatuses([
      this.getCommerceFreshness(context),
      this.getPaymentsFreshness(context),
    ]);

    if (trust.shopifyStatus === 'failed' || trust.shopifyStatus === 'stale') {
      signals.push(
        this.createSignal({
          type: 'sync_issue',
          title: 'Store data may be outdated',
          summary:
            trust.shopifyStatus === 'failed'
              ? 'The latest store sync failed and current insight may be incomplete.'
              : 'Store data is older than expected and current insight may be stale.',
          reason:
            trust.shopifyStatus === 'failed'
              ? 'Shopify sync did not complete successfully.'
              : 'The latest Shopify sync is outside the expected freshness window.',
          severity: trust.shopifyStatus === 'failed' ? 'critical' : 'high',
          confidence: 'high',
          freshnessStatus: 'stale',
          affectedArea: 'integrations',
          evidence: this.compactList(
            trust.evidence.filter((item) => item.toLowerCase().includes('shopify')),
          ),
          recommendedNextStep: 'Review the latest Shopify sync run before relying on new signals.',
          dedupeKey: 'sync_issue:shopify',
          metadata: {
            integration: 'shopify',
            syncStatus: latestStoreSyncRun?.status ?? null,
            trustStatus: trust.shopifyStatus,
          } as Prisma.InputJsonValue,
        }),
      );
    } else if (trust.shopifyStatus === 'delayed') {
      signals.push(
        this.createSignal({
          type: 'sync_issue',
          title: 'Store data is arriving late',
          summary: 'Store data is delayed, so the latest signal set may not reflect the current hour.',
          reason: 'The latest Shopify sync is behind the expected freshness window.',
          severity: 'medium',
          confidence: 'high',
          freshnessStatus: 'delayed',
          affectedArea: 'integrations',
          evidence: this.compactList(
            trust.evidence.filter((item) => item.toLowerCase().includes('shopify')),
          ),
          recommendedNextStep: 'Monitor the next Shopify sync before escalating demand or revenue changes.',
          dedupeKey: 'sync_issue:shopify_delayed',
          metadata: {
            integration: 'shopify',
            syncStatus: latestStoreSyncRun?.status ?? null,
            trustStatus: trust.shopifyStatus,
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (trust.coverageStatus === 'partial' || trust.coverageStatus === 'minimal') {
      signals.push(
        this.createSignal({
          type: 'data_coverage_limit',
          title: 'Customer and order coverage is limited',
          summary: 'Some Shopify order or customer insight is unavailable because store coverage is still limited.',
          reason: metrics.protectedCustomerDataRequired
            ? 'Protected customer data approval is still pending.'
            : 'The latest Shopify sync reported only partial coverage.',
          severity: metrics.protectedCustomerDataRequired ? 'high' : 'medium',
          confidence: 'high',
          freshnessStatus: this.getCommerceFreshness(context),
          affectedArea: 'data_quality',
          evidence: this.compactList([
            ...trust.evidence,
            ...trust.limitations,
          ]),
          recommendedNextStep: 'Complete store data approval so Nexora can evaluate orders and customers fully.',
          dedupeKey: 'data_coverage_limit:shopify',
          metadata: {
            protectedCustomerDataRequired: metrics.protectedCustomerDataRequired,
            shopifyDataCoverage: metrics.shopifyDataCoverage,
            coverageStatus: trust.coverageStatus,
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (trust.stripeStatus === 'not_connected') {
      signals.push(
        this.createSignal({
          type: 'payment_visibility_gap',
          title: 'Payments are not connected',
          summary: 'Payment, refund, and dispute monitoring is unavailable because Stripe is not connected.',
          reason: 'Nexora cannot validate payment-side behavior until Stripe is linked.',
          severity: 'high',
          confidence: 'high',
          freshnessStatus: 'stale',
          affectedArea: 'payments',
          evidence: this.compactList([
            ...trust.evidence.filter((item) => item.toLowerCase().includes('stripe') || item.toLowerCase().includes('payment')),
            ...trust.limitations.filter((item) => item.toLowerCase().includes('payment')),
          ]),
          recommendedNextStep: 'Connect Stripe to unlock payment, refund, and dispute visibility.',
          dedupeKey: 'payment_visibility_gap:missing_stripe',
          metadata: {
            integration: 'stripe',
            connected: false,
          } as Prisma.InputJsonValue,
        }),
      );
    } else if (trust.stripeStatus === 'failed' || trust.stripeStatus === 'stale' || trust.stripeStatus === 'delayed') {
      signals.push(
        this.createSignal({
          type: 'payment_visibility_gap',
          title:
            trust.stripeStatus === 'delayed'
              ? 'Payment visibility is delayed'
              : 'Payment visibility may be stale',
          summary:
            trust.stripeStatus === 'failed'
              ? 'The latest Stripe sync failed and payment telemetry may be incomplete.'
              : trust.stripeStatus === 'delayed'
                ? 'Stripe data is arriving late, so payment telemetry may lag recent activity.'
                : 'Stripe data is older than expected and finance visibility may be stale.',
          reason:
            trust.stripeStatus === 'failed'
              ? 'Stripe sync did not complete successfully.'
              : trust.stripeStatus === 'delayed'
                ? 'The latest Stripe sync is behind the expected freshness window.'
                : 'The latest Stripe sync is outside the expected freshness window.',
          severity: trust.stripeStatus === 'failed' ? 'high' : 'medium',
          confidence: 'high',
          freshnessStatus: this.getPaymentsFreshness(context),
          affectedArea: 'payments',
          evidence: this.compactList(
            trust.evidence.filter((item) => item.toLowerCase().includes('stripe') || item.toLowerCase().includes('payment')),
          ),
          recommendedNextStep: 'Restore Stripe sync health before using payment-side anomalies in decision-making.',
          dedupeKey:
            trust.stripeStatus === 'delayed'
              ? 'payment_visibility_gap:delayed_stripe'
              : 'payment_visibility_gap:stale_stripe',
          metadata: {
            integration: 'stripe',
            connected: true,
            syncStatus: latestStripeSyncRun?.status ?? null,
            trustStatus: trust.stripeStatus,
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (revenueChangeRatio !== null && revenueChangeRatio <= -0.2) {
      signals.push(
        this.createSignal({
          type: 'revenue_drop',
          title: 'Revenue is down versus the previous day',
          summary: `Revenue is ${this.formatSignedPercent(revenueChangeRatio)} lower than the previous 24-hour window.`,
          reason: `Revenue moved from ${this.formatCurrency(metrics.previous24h.revenue)} to ${this.formatCurrency(metrics.current24h.revenue)}.`,
          severity:
            revenueChangeRatio <= -0.5
              ? 'critical'
              : revenueChangeRatio <= -0.35
                ? 'high'
                : 'medium',
          confidence: this.toCommerceConfidence(context),
          freshnessStatus: this.getCommerceFreshness(context),
          affectedArea: 'revenue',
          evidence: this.compactList([
            `Revenue changed ${this.formatSignedPercent(revenueChangeRatio)} versus the previous 24-hour window.`,
            `Current 24-hour revenue: ${this.formatCurrency(metrics.current24h.revenue)}.`,
            `Previous 24-hour revenue: ${this.formatCurrency(metrics.previous24h.revenue)}.`,
          ]),
          recommendedNextStep: 'Review current demand, promotions, and conversion drivers behind the revenue decline.',
          dedupeKey: 'revenue_drop',
          metadata: {
            revenueChangeRatio,
            currentRevenue: metrics.current24h.revenue,
            previousRevenue: metrics.previous24h.revenue,
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (orderChangeRatio !== null && orderChangeRatio <= -0.2) {
      signals.push(
        this.createSignal({
          type: 'order_slowdown',
          title: 'Order volume has slowed',
          summary: `Orders are ${this.formatSignedPercent(orderChangeRatio)} lower than the previous 24-hour window.`,
          reason: `Orders moved from ${metrics.previous24h.orders} to ${metrics.current24h.orders} across the last two 24-hour windows.`,
          severity:
            orderChangeRatio <= -0.5
              ? 'high'
              : orderChangeRatio <= -0.35
                ? 'high'
                : 'medium',
          confidence: this.toCommerceConfidence(context),
          freshnessStatus: this.getCommerceFreshness(context),
          affectedArea: 'orders',
          evidence: this.compactList([
            `Orders changed ${this.formatSignedPercent(orderChangeRatio)} versus the previous 24-hour window.`,
            `Current 24-hour orders: ${metrics.current24h.orders}.`,
            `Previous 24-hour orders: ${metrics.previous24h.orders}.`,
          ]),
          recommendedNextStep: 'Confirm whether the order slowdown reflects softer demand or a store-side issue.',
          dedupeKey: 'order_slowdown',
          metadata: {
            orderChangeRatio,
            currentOrders: metrics.current24h.orders,
            previousOrders: metrics.previous24h.orders,
          } as Prisma.InputJsonValue,
        }),
      );
    }

    const customerSlowdownTriggered =
      (newCustomerChangeRatio !== null && newCustomerChangeRatio <= -0.25) ||
      (hoursSinceLastCustomer !== null && hoursSinceLastCustomer >= 24) ||
      customerMetrics.retentionPressure !== 'LOW';
    if (customerSlowdownTriggered) {
      const severity =
        customerMetrics.retentionPressure === 'HIGH' ||
        (hoursSinceLastCustomer !== null && hoursSinceLastCustomer >= 72)
          ? 'high'
          : 'medium';
      signals.push(
        this.createSignal({
          type: 'customer_slowdown',
          title: 'Customer activity is softer than expected',
          summary:
            hoursSinceLastCustomer !== null && hoursSinceLastCustomer >= 24
              ? `No new customer activity has been recorded for ${Math.floor(hoursSinceLastCustomer)} hours.`
              : `Customer acquisition is ${this.formatSignedPercent(newCustomerChangeRatio ?? 0)} versus the previous 24-hour window.`,
          reason:
            customerMetrics.retentionPressure !== 'LOW'
              ? `Retention pressure is ${customerMetrics.retentionPressure.toLowerCase()} with ${customerMetrics.atRiskCustomers} at-risk customers and ${customerMetrics.dormantCustomers} dormant customers.`
              : 'Customer acquisition is slower than the previous 24-hour window.',
          severity,
          confidence: this.toCommerceConfidence(context),
          freshnessStatus: this.getCommerceFreshness(context),
          affectedArea: 'customers',
          evidence: this.compactList([
            newCustomerChangeRatio !== null
              ? `New customers changed ${this.formatSignedPercent(newCustomerChangeRatio)} versus the previous 24-hour window.`
              : null,
            hoursSinceLastCustomer !== null
              ? `Latest customer activity was ${Math.floor(hoursSinceLastCustomer)} hours ago.`
              : null,
            customerMetrics.retentionPressure !== 'LOW'
              ? `${customerMetrics.atRiskCustomers} at-risk and ${customerMetrics.dormantCustomers} dormant customers are currently tracked.`
              : null,
          ]),
          recommendedNextStep: 'Review acquisition pace and retention pressure before customer demand weakens further.',
          dedupeKey: 'customer_slowdown',
          metadata: {
            newCustomerChangeRatio,
            hoursSinceLastCustomer,
            retentionPressure: customerMetrics.retentionPressure,
            atRiskCustomers: customerMetrics.atRiskCustomers,
            dormantCustomers: customerMetrics.dormantCustomers,
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (metrics.topProduct && metrics.topProductRevenueShare30d !== null && metrics.topProductRevenueShare30d >= 0.45) {
      signals.push(
        this.createSignal({
          type: 'product_concentration_risk',
          title: 'Revenue is concentrated in a narrow product set',
          summary: `${metrics.topProduct.title} represents ${this.formatPercent(metrics.topProductRevenueShare30d)} of tracked product revenue across the last 30 days.`,
          reason: 'A narrow product mix can increase concentration risk and reduce resilience if demand changes suddenly.',
          severity: metrics.topProductRevenueShare30d >= 0.65 ? 'high' : 'medium',
          confidence: 'medium',
          freshnessStatus: baseFreshness,
          affectedArea: 'products',
          evidence: this.compactList([
            `${metrics.topProduct.title} generated ${this.formatCurrency(metrics.topProduct.revenue)} across ${metrics.topProduct.unitsSold} units in the last 30 days.`,
            `Tracked 30-day product revenue share: ${this.formatPercent(metrics.topProductRevenueShare30d)}.`,
          ]),
          recommendedNextStep: 'Review whether the current top product concentration introduces near-term assortment risk.',
          dedupeKey: `product_concentration_risk:${metrics.topProduct.productId ?? metrics.topProduct.title}`,
          metadata: {
            productId: metrics.topProduct.productId,
            title: metrics.topProduct.title,
            revenue: metrics.topProduct.revenue,
            unitsSold: metrics.topProduct.unitsSold,
            topProductRevenueShare30d: metrics.topProductRevenueShare30d,
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (
      (revenueChangeRatio !== null && revenueChangeRatio >= 0.25) ||
      (orderChangeRatio !== null && orderChangeRatio >= 0.25)
    ) {
      const strongestPositiveChange =
        Math.max(revenueChangeRatio ?? 0, orderChangeRatio ?? 0);
      signals.push(
        this.createSignal({
          type: 'demand_spike',
          title: 'Demand is stronger than the previous day',
          summary: `Demand is up ${this.formatSignedPercent(strongestPositiveChange)} versus the previous 24-hour window.`,
          reason: 'Revenue or order growth has moved beyond the normal daily baseline.',
          severity: strongestPositiveChange >= 0.5 ? 'medium' : 'low',
          confidence: this.toCommerceConfidence(context),
          freshnessStatus: this.getCommerceFreshness(context),
          affectedArea: strongestPositiveChange === (revenueChangeRatio ?? 0) ? 'revenue' : 'orders',
          evidence: this.compactList([
            revenueChangeRatio !== null && revenueChangeRatio >= 0.25
              ? `Revenue changed ${this.formatSignedPercent(revenueChangeRatio)} versus the previous 24-hour window.`
              : null,
            orderChangeRatio !== null && orderChangeRatio >= 0.25
              ? `Orders changed ${this.formatSignedPercent(orderChangeRatio)} versus the previous 24-hour window.`
              : null,
          ]),
          recommendedNextStep: 'Confirm that inventory, fulfillment, and merchandising can support the stronger demand.',
          dedupeKey: 'demand_spike',
          metadata: {
            revenueChangeRatio,
            orderChangeRatio,
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (
      metrics.stripeConnected &&
      (metrics.stripeFailedPaymentsCurrent24h > metrics.stripeFailedPaymentsPrevious24h ||
        metrics.stripeRefundsCurrent24h > 0 ||
        metrics.stripeDisputesCurrent24h > 0 ||
        (metrics.current24h.orders > 0 &&
          metrics.stripeSuccessfulChargesCurrent24h > 0 &&
          Math.abs(metrics.current24h.orders - metrics.stripeSuccessfulChargesCurrent24h) >= 5))
    ) {
      const paymentAnomalyEvidence = this.compactList([
        metrics.stripeFailedPaymentsCurrent24h > metrics.stripeFailedPaymentsPrevious24h
          ? `Failed payments rose to ${metrics.stripeFailedPaymentsCurrent24h} from ${metrics.stripeFailedPaymentsPrevious24h} in the last two 24-hour windows.`
          : null,
        metrics.stripeRefundsCurrent24h > 0
          ? `${metrics.stripeRefundsCurrent24h} refunds were recorded in the last 24 hours.`
          : null,
        metrics.stripeDisputesCurrent24h > 0
          ? `${metrics.stripeDisputesCurrent24h} disputes were recorded in the last 24 hours.`
          : null,
        metrics.current24h.orders > 0 &&
        metrics.stripeSuccessfulChargesCurrent24h > 0 &&
        Math.abs(metrics.current24h.orders - metrics.stripeSuccessfulChargesCurrent24h) >= 5
          ? `Shopify recorded ${metrics.current24h.orders} orders while Stripe recorded ${metrics.stripeSuccessfulChargesCurrent24h} successful charges in the current 24-hour window.`
          : null,
      ]);
      const paymentSeverity =
        metrics.stripeDisputesCurrent24h > 0 ||
        metrics.stripeFailedPaymentsCurrent24h >= Math.max(metrics.stripeFailedPaymentsPrevious24h * 2, 3)
          ? 'high'
          : 'medium';

      signals.push(
        this.createSignal({
          type: 'unusual_change',
          title: 'Payment behavior changed materially',
          summary: 'Payment-side anomalies were detected and may need finance review.',
          reason: 'Recent payment failures, refunds, disputes, or charge alignment drift exceeded the normal baseline.',
          severity: paymentSeverity,
          confidence: 'high',
          freshnessStatus: this.getPaymentsFreshness(context),
          affectedArea: 'payments',
          evidence: paymentAnomalyEvidence,
          recommendedNextStep: 'Review recent payment anomalies before they affect revenue confidence or customer experience.',
          dedupeKey: 'unusual_change:payments',
          metadata: {
            stripeFailedPaymentsCurrent24h: metrics.stripeFailedPaymentsCurrent24h,
            stripeRefundsCurrent24h: metrics.stripeRefundsCurrent24h,
            stripeDisputesCurrent24h: metrics.stripeDisputesCurrent24h,
            stripeSuccessfulChargesCurrent24h: metrics.stripeSuccessfulChargesCurrent24h,
            shopifyOrdersCurrent24h: metrics.current24h.orders,
          } as Prisma.InputJsonValue,
        }),
      );
    }

    return signals;
  }

  private dedupeSignals(signals: SignalDraft[]) {
    const deduped = new Map<string, SignalDraft>();

    for (const signal of signals) {
      const existing = deduped.get(signal.dedupeKey);
      if (!existing || this.compareSignals(signal, existing) < 0) {
        deduped.set(signal.dedupeKey, signal);
      }
    }

    return [...deduped.values()];
  }

  private rankSignals(signals: SignalDraft[]) {
    return [...signals].sort((left, right) => this.compareSignals(left, right));
  }

  private compareSignals(left: Pick<SignalDraft, 'severity' | 'freshnessStatus' | 'confidence' | 'title'>, right: Pick<SignalDraft, 'severity' | 'freshnessStatus' | 'confidence' | 'title'>) {
    const severityDelta = this.scoreSeverity(right.severity) - this.scoreSeverity(left.severity);
    if (severityDelta !== 0) {
      return severityDelta;
    }

    const freshnessDelta = this.scoreFreshness(right.freshnessStatus) - this.scoreFreshness(left.freshnessStatus);
    if (freshnessDelta !== 0) {
      return freshnessDelta;
    }

    const confidenceDelta = this.scoreConfidence(right.confidence) - this.scoreConfidence(left.confidence);
    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }

    return left.title.localeCompare(right.title);
  }

  private async persistSignals(organizationId: string, drafts: SignalDraft[], forceRefresh: boolean) {
    const existingSignals = await this.prismaService.aiSignal.findMany({
      where: {
        organizationId,
        isActive: true,
        type: { in: [...MANAGED_SIGNAL_TYPES] },
      },
      orderBy: [{ detectedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const existingViews = existingSignals.map((signal) => this.toSignalView(signal));
    const existingFingerprints = existingSignals
      .map((signal) => this.asString(this.asRecord(signal.metadata)?.fingerprint))
      .filter((value): value is string => Boolean(value))
      .sort();
    const draftFingerprints = drafts.map((draft) => draft.fingerprint).sort();
    const unchanged =
      !forceRefresh &&
      existingSignals.length === drafts.length &&
      existingFingerprints.length === draftFingerprints.length &&
      existingFingerprints.every((value, index) => value === draftFingerprints[index]);

    if (unchanged) {
      return this.sortSignalViews(existingViews);
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.aiSignal.updateMany({
        where: {
          organizationId,
          type: { in: [...MANAGED_SIGNAL_TYPES] },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      for (const draft of drafts) {
        await tx.aiSignal.create({
          data: {
            organizationId,
            type: draft.type,
            severity: draft.severity,
            title: draft.title,
            description: draft.summary,
            metadata: {
              summary: draft.summary,
              reason: draft.reason,
              confidence: draft.confidence,
              freshnessStatus: draft.freshnessStatus,
              affectedArea: draft.affectedArea,
              evidence: draft.evidence,
              recommendedNextStep: draft.recommendedNextStep,
              dedupeKey: draft.dedupeKey,
              fingerprint: draft.fingerprint,
              ...(this.asRecord(draft.metadata) ?? {}),
            } as Prisma.InputJsonValue,
            isActive: true,
          },
        });
      }
    });

    await this.aiNotificationService.generateNotificationsForOrganization(organizationId, {
      signals: drafts.map((draft) => ({
        type: draft.type,
        severity: draft.severity.toUpperCase(),
        title: draft.title,
        description: draft.summary,
      })),
    });

    const persistedSignals = await this.prismaService.aiSignal.findMany({
      where: {
        organizationId,
        isActive: true,
        type: { in: [...MANAGED_SIGNAL_TYPES] },
      },
    });

    return this.sortSignalViews(persistedSignals.map((signal) => this.toSignalView(signal)));
  }

  private applyFilters(signals: CanonicalAiSignal[], query: QueryAiSignalsDto) {
    return signals.filter((signal) => {
      if (query.severity && signal.severity !== query.severity) {
        return false;
      }

      if (query.affectedArea && signal.affectedArea !== query.affectedArea) {
        return false;
      }

      if (query.freshnessStatus && signal.freshnessStatus !== query.freshnessStatus) {
        return false;
      }

      if (query.type && signal.type !== query.type) {
        return false;
      }

      return true;
    });
  }

  private sortSignalViews(signals: CanonicalAiSignal[]) {
    return [...signals].sort((left, right) => this.compareSignals(left, right));
  }

  private toSignalView(signal: {
    id: string;
    organizationId: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    metadata: Prisma.JsonValue | null;
    detectedAt: Date;
    createdAt: Date;
    isActive: boolean;
  }): CanonicalAiSignal {
    const metadata = this.asRecord(signal.metadata);

    return {
      id: signal.id,
      organizationId: signal.organizationId,
      type: signal.type,
      title: signal.title,
      summary: this.asString(metadata?.summary) ?? signal.description,
      description: signal.description,
      reason: this.asString(metadata?.reason) ?? signal.description,
      severity: this.normalizeSeverity(signal.severity),
      confidence: this.normalizeConfidence(this.asString(metadata?.confidence)),
      freshnessStatus: this.normalizeFreshness(this.asString(metadata?.freshnessStatus)),
      affectedArea: this.normalizeAffectedArea(this.asString(metadata?.affectedArea)),
      evidence: this.asStringArray(metadata?.evidence),
      recommendedNextStep:
        this.asString(metadata?.recommendedNextStep) ?? 'Review the current signal before taking action.',
      metadata,
      detectedAt: signal.detectedAt.toISOString(),
      updatedAt: signal.detectedAt.toISOString(),
      createdAt: signal.createdAt.toISOString(),
      isActive: signal.isActive,
    };
  }

  private createSignal(input: Omit<SignalDraft, 'fingerprint'>): SignalDraft {
    const fingerprint = JSON.stringify({
      type: input.type,
      summary: input.summary,
      reason: input.reason,
      severity: input.severity,
      confidence: input.confidence,
      freshnessStatus: input.freshnessStatus,
      affectedArea: input.affectedArea,
      evidence: input.evidence,
      recommendedNextStep: input.recommendedNextStep,
      dedupeKey: input.dedupeKey,
    });

    return {
      ...input,
      fingerprint,
    };
  }

  private getCommerceFreshness(context: SignalContext): SignalFreshnessStatus {
    return this.mapTrustFreshness(context.trust.freshnessStatus);
  }

  private getPaymentsFreshness(context: SignalContext): SignalFreshnessStatus {
    if (!context.stripeAccount || context.trust.stripeStatus === 'not_connected') {
      return 'stale';
    }

    return this.mapTrustFreshness(
      context.trust.stripeStatus === 'failed' || context.trust.stripeStatus === 'stale'
        ? 'stale'
        : context.trust.stripeStatus === 'delayed'
          ? 'delayed'
          : 'up_to_date',
    );
  }

  private mapTrustFreshness(
    freshnessStatus: 'up_to_date' | 'delayed' | 'stale',
  ): SignalFreshnessStatus {
    if (freshnessStatus === 'up_to_date') {
      return 'fresh';
    }

    return freshnessStatus;
  }

  private mergeFreshnessStatuses(statuses: SignalFreshnessStatus[]) {
    if (statuses.includes('stale')) {
      return 'stale';
    }

    if (statuses.includes('delayed')) {
      return 'delayed';
    }

    return 'fresh';
  }

  private toCommerceConfidence(context: SignalContext): SignalConfidence {
    if (context.metrics.shopifyLimitedAccess) {
      return 'medium';
    }

    return this.getCommerceFreshness(context) === 'fresh' ? 'high' : 'medium';
  }

  private scoreSeverity(value: SignalSeverity) {
    return value === 'critical' ? 4 : value === 'high' ? 3 : value === 'medium' ? 2 : 1;
  }

  private scoreFreshness(value: SignalFreshnessStatus) {
    return value === 'fresh' ? 3 : value === 'delayed' ? 2 : 1;
  }

  private scoreConfidence(value: SignalConfidence) {
    return value === 'high' ? 3 : value === 'medium' ? 2 : 1;
  }

  private normalizeSeverity(value: string): SignalSeverity {
    const normalized = value.toLowerCase();
    if (normalized === 'critical' || normalized === 'high' || normalized === 'medium') {
      return normalized;
    }

    return 'low';
  }

  private normalizeConfidence(value: string | null | undefined): SignalConfidence {
    const normalized = value?.toLowerCase();
    if (normalized === 'high' || normalized === 'medium') {
      return normalized;
    }

    return 'low';
  }

  private normalizeFreshness(value: string | null | undefined): SignalFreshnessStatus {
    const normalized = value?.toLowerCase();
    if (normalized === 'stale' || normalized === 'delayed') {
      return normalized;
    }

    return 'fresh';
  }

  private normalizeAffectedArea(value: string | null | undefined): SignalAffectedArea {
    if (
      value === 'revenue' ||
      value === 'orders' ||
      value === 'customers' ||
      value === 'products' ||
      value === 'integrations' ||
      value === 'payments' ||
      value === 'data_quality'
    ) {
      return value;
    }

    return 'data_quality';
  }

  private asRecord(value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private asString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private asStringArray(value: unknown) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
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

  private formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private formatSignedPercent(value: number) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(0)}%`;
  }

  private formatPercent(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
