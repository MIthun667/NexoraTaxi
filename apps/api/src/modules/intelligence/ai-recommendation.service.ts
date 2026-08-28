import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AiDataTrustService, CanonicalDataTrustStatus } from './ai-data-trust.service';
import { AiLearningService } from './ai-learning.service';
import { AiNotificationService } from './ai-notification.service';
import { AiCommerceMetricsService, CommerceOverviewMetrics } from './ai-commerce-metrics.service';
import { AiSignalService, CanonicalAiSignal, SignalConfidence, SignalFreshnessStatus } from './ai-signal.service';
import { QueryAiRecommendationsDto } from './dto/query-ai-recommendations.dto';
import { RefreshAiRecommendationsDto } from './dto/refresh-ai-recommendations.dto';

export type RecommendationUrgency = 'low' | 'medium' | 'high';
export type RecommendationStatus = 'active' | 'archived' | 'superseded';
export type RecommendationAffectedArea =
  | 'revenue'
  | 'orders'
  | 'customers'
  | 'products'
  | 'integrations'
  | 'payments'
  | 'data_quality';

export type CanonicalAiRecommendation = {
  id: string;
  organizationId: string;
  type: string;
  category: string;
  title: string;
  summary: string;
  description: string;
  rationale: string;
  evidence: string[];
  urgency: RecommendationUrgency;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedOutcome: string;
  affectedArea: RecommendationAffectedArea;
  confidence: SignalConfidence;
  status: RecommendationStatus;
  relatedSignalType?: string | null;
  metadata?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RecommendationDraft = {
  type: string;
  title: string;
  summary: string;
  rationale: string;
  evidence: string[];
  urgency: RecommendationUrgency;
  expectedOutcome: string;
  affectedArea: RecommendationAffectedArea;
  confidence: SignalConfidence;
  status: RecommendationStatus;
  relatedSignalType?: string;
  dedupeKey: string;
  fingerprint: string;
  metadata?: Prisma.InputJsonValue;
};

const MANAGED_RECOMMENDATION_TYPES = [
  'improve_visibility',
  'review_sync_health',
  'monitor_revenue_decline',
  'investigate_customer_slowdown',
  'reduce_product_concentration',
  'review_payment_reliability',
  'capitalize_on_demand_spike',
  'validate_unusual_change',
  'urgent-commerce-review',
  'revenue-diagnostics',
  'customer-retention',
  'product-concentration',
  'customer-protection',
  'retention-recovery',
  'telemetry-gap',
  'performance-stability',
] as const;

@Injectable()
export class AiRecommendationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiDataTrustService: AiDataTrustService,
    private readonly aiSignalService: AiSignalService,
    private readonly aiLearningService: AiLearningService,
    private readonly aiNotificationService: AiNotificationService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async listRecommendations(principal: CurrentPrincipal, query: QueryAiRecommendationsDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const recommendations = await this.ensureRecommendations(principal, organizationId, false);

    return buildSuccessResponse(
      'AI recommendations retrieved successfully.',
      this.applyFilters(recommendations, query),
    );
  }

  async refreshRecommendations(principal: CurrentPrincipal, dto: RefreshAiRecommendationsDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );
    const recommendations = await this.ensureRecommendations(principal, organizationId, true);

    return buildSuccessResponse(
      'AI recommendations refreshed successfully.',
      recommendations,
    );
  }

  async getRecommendationById(
    principal: CurrentPrincipal,
    recommendationId: string,
    query: QueryAiRecommendationsDto,
  ) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const recommendations = await this.ensureRecommendations(principal, organizationId, false);
    const recommendation = recommendations.find((item) => item.id === recommendationId);

    if (!recommendation) {
      throw new NotFoundException('Recommendation could not be found.');
    }

    return buildSuccessResponse('AI recommendation retrieved successfully.', recommendation);
  }

  async generateRecommendations(
    principal: CurrentPrincipal,
    dto: RefreshAiRecommendationsDto,
  ) {
    return this.refreshRecommendations(principal, dto);
  }

  async getCanonicalRecommendations(
    principal: CurrentPrincipal,
    query: QueryAiRecommendationsDto,
    options?: { forceRefresh?: boolean },
  ) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );

    return this.ensureRecommendations(principal, organizationId, options?.forceRefresh ?? false);
  }

  private async ensureRecommendations(
    principal: CurrentPrincipal,
    organizationId: string,
    forceRefresh: boolean,
  ) {
    const [metrics, signals, trust] = await Promise.all([
      this.aiCommerceMetricsService.getCommerceOverviewMetrics(organizationId),
      this.aiSignalService.getCanonicalSignals(principal, { organizationId }),
      this.aiDataTrustService.getTrustForOrganization(organizationId),
    ]);

    const initialDrafts = this.dedupeRecommendations(this.buildRecommendations(metrics, signals, trust));
    
    // Enrich with learning signals
    const scoredDrafts = await Promise.all(
      initialDrafts.map(async (draft) => {
        const [effectiveness, bias] = await Promise.all([
          this.aiLearningService.getHistoricalEffectivenessScore(organizationId, draft.type),
          this.aiLearningService.getDecisionBiasScore(organizationId, draft.type),
        ]);
        
        return {
          ...draft,
          metadata: {
            ...(draft.metadata as object || {}),
            historicalEffectiveness: effectiveness,
            decisionBias: bias,
          } as Prisma.InputJsonValue,
        };
      })
    );

    const drafts = this.rankRecommendations(scoredDrafts).slice(0, 6);
    const persisted = await this.persistRecommendations(organizationId, drafts, forceRefresh);

    this.logger.debug({
      event: 'ai.recommendations.generated',
      organizationId,
      recommendationCount: persisted.length,
      categories: persisted.map((recommendation) => recommendation.type),
    });

    return persisted;
  }

  private buildRecommendations(
    metrics: CommerceOverviewMetrics,
    signals: CanonicalAiSignal[],
    trust: CanonicalDataTrustStatus,
  ) {
    const recommendations: RecommendationDraft[] = [];
    const coverageSignal = signals.find((signal) => signal.type === 'data_coverage_limit');
    const syncSignal = signals.find((signal) => signal.type === 'sync_issue');
    const revenueSignal = signals.find((signal) => signal.type === 'revenue_drop' || signal.type === 'order_slowdown');
    const customerSignal = signals.find((signal) => signal.type === 'customer_slowdown');
    const productSignal = signals.find((signal) => signal.type === 'product_concentration_risk');
    const paymentSignal = signals.find((signal) => signal.type === 'payment_visibility_gap');
    const demandSpikeSignal = signals.find((signal) => signal.type === 'demand_spike');
    const unusualChangeSignal = signals.find((signal) => signal.type === 'unusual_change');

    if (coverageSignal) {
      recommendations.push(
        this.createRecommendation({
          type: 'improve_visibility',
          title: 'Improve store visibility before relying on trend comparisons',
          summary: 'Resolve current store coverage limits before leaning on customer or order trend analysis.',
          rationale:
            'Trend comparisons are less reliable while Shopify coverage is limited or protected customer access is still pending.',
          evidence: coverageSignal.evidence,
          urgency: coverageSignal.severity === 'high' || coverageSignal.severity === 'critical' ? 'high' : 'medium',
          expectedOutcome:
            'Improve decision quality by restoring complete order and customer visibility before making commercial changes.',
          affectedArea: 'data_quality',
          confidence: this.adjustConfidenceForTrust(coverageSignal.confidence, trust),
          status: 'active',
          relatedSignalType: coverageSignal.type,
          dedupeKey: 'improve_visibility',
          metadata: {
            sourceSignalIds: [coverageSignal.id],
            sourceSignalFreshness: [coverageSignal.freshnessStatus],
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (syncSignal) {
      recommendations.push(
        this.createRecommendation({
          type: 'review_sync_health',
          title: 'Restore data freshness before acting on recent changes',
          summary: 'Review store or payment sync health before treating the latest performance movement as complete.',
          rationale:
            'Recent performance signals depend on fresh source data, and current sync health may limit how much confidence operators should place in short-term changes.',
          evidence: syncSignal.evidence,
          urgency: syncSignal.severity === 'critical' ? 'high' : 'medium',
          expectedOutcome:
            'Reduce the risk of acting on stale data by confirming that current store and payment telemetry is up to date.',
          affectedArea: 'integrations',
          confidence: this.adjustConfidenceForTrust(syncSignal.confidence, trust),
          status: 'active',
          relatedSignalType: syncSignal.type,
          dedupeKey: 'review_sync_health',
          metadata: {
            sourceSignalIds: [syncSignal.id],
            sourceSignalFreshness: [syncSignal.freshnessStatus],
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (revenueSignal) {
      recommendations.push(
        this.createRecommendation({
          type: 'monitor_revenue_decline',
          title: 'Review revenue decline drivers before changing pricing or acquisition',
          summary: 'Inspect what is driving the current revenue and order decline before making reactive commercial changes.',
          rationale:
            'A meaningful decline in revenue or orders should be understood before operators adjust pricing, merchandising, or acquisition decisions.',
          evidence: this.compactList([
            ...revenueSignal.evidence,
            metrics.changes.revenueChangeRatio !== null
              ? `Revenue changed ${this.formatSignedPercent(metrics.changes.revenueChangeRatio)} versus the previous 24-hour window.`
              : null,
            metrics.changes.orderChangeRatio !== null
              ? `Orders changed ${this.formatSignedPercent(metrics.changes.orderChangeRatio)} versus the previous 24-hour window.`
              : null,
          ]),
          urgency: revenueSignal.severity === 'critical' || revenueSignal.severity === 'high' ? 'high' : 'medium',
          expectedOutcome:
            'Improve decision quality by determining whether the decline is temporary, structural, or caused by incomplete visibility.',
          affectedArea: revenueSignal.affectedArea === 'orders' ? 'orders' : 'revenue',
          confidence: this.adjustConfidenceForTrust(revenueSignal.confidence, trust),
          status: 'active',
          relatedSignalType: revenueSignal.type,
          dedupeKey: 'monitor_revenue_decline',
          metadata: {
            sourceSignalIds: [revenueSignal.id],
            sourceSignalFreshness: [revenueSignal.freshnessStatus],
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (customerSignal) {
      recommendations.push(
        this.createRecommendation({
          type: 'investigate_customer_slowdown',
          title: 'Inspect acquisition and retention signals to explain customer slowdown',
          summary: 'Review whether current customer softness is driven by weaker acquisition, retention pressure, or limited visibility.',
          rationale:
            'Customer slowdown becomes more actionable when operators can separate acquisition softness from retention pressure and data limitations.',
          evidence: customerSignal.evidence,
          urgency: customerSignal.severity === 'high' || customerSignal.severity === 'critical' ? 'high' : 'medium',
          expectedOutcome:
            'Improve customer decision-making by identifying whether the slowdown is acquisition-related, retention-related, or a data freshness issue.',
          affectedArea: 'customers',
          confidence: this.adjustConfidenceForTrust(customerSignal.confidence, trust),
          status: 'active',
          relatedSignalType: customerSignal.type,
          dedupeKey: 'investigate_customer_slowdown',
          metadata: {
            sourceSignalIds: [customerSignal.id],
            sourceSignalFreshness: [customerSignal.freshnessStatus],
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (productSignal) {
      recommendations.push(
        this.createRecommendation({
          type: 'reduce_product_concentration',
          title: 'Review catalog mix to reduce dependency on a single product',
          summary: 'Assess whether the current product leader is creating concentration risk that should be managed.',
          rationale:
            'A narrow product mix can boost short-term revenue while increasing exposure if demand shifts or availability changes suddenly.',
          evidence: productSignal.evidence,
          urgency: productSignal.severity === 'high' || productSignal.severity === 'critical' ? 'high' : 'medium',
          expectedOutcome:
            'Improve operating resilience by understanding whether current catalog momentum is concentrated too narrowly.',
          affectedArea: 'products',
          confidence: this.adjustConfidenceForTrust(productSignal.confidence, trust),
          status: 'active',
          relatedSignalType: productSignal.type,
          dedupeKey: 'reduce_product_concentration',
          metadata: {
            sourceSignalIds: [productSignal.id],
            sourceSignalFreshness: [productSignal.freshnessStatus],
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (paymentSignal) {
      recommendations.push(
        this.createRecommendation({
          type: 'review_payment_reliability',
          title: 'Review payment reliability before relying on finance-side conclusions',
          summary: 'Confirm that payment visibility and reliability are healthy before using payment-side anomalies in operational decisions.',
          rationale:
            'Payment-side interpretation is only trustworthy when Stripe connectivity and sync health are current and complete.',
          evidence: paymentSignal.evidence,
          urgency: paymentSignal.severity === 'high' || paymentSignal.severity === 'critical' ? 'high' : 'medium',
          expectedOutcome:
            'Improve confidence in finance-related decisions by restoring or validating payment visibility first.',
          affectedArea: 'payments',
          confidence: this.adjustConfidenceForTrust(paymentSignal.confidence, trust),
          status: 'active',
          relatedSignalType: paymentSignal.type,
          dedupeKey: 'review_payment_reliability',
          metadata: {
            sourceSignalIds: [paymentSignal.id],
            sourceSignalFreshness: [paymentSignal.freshnessStatus],
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (demandSpikeSignal) {
      recommendations.push(
        this.createRecommendation({
          type: 'capitalize_on_demand_spike',
          title: 'Validate whether current demand strength is sustainable',
          summary: 'Review whether the current demand spike is durable and operationally supported before expanding around it.',
          rationale:
            'Short-term demand strength can be valuable, but operators should confirm that fulfillment, assortment, and merchandising can support it sustainably.',
          evidence: demandSpikeSignal.evidence,
          urgency: demandSpikeSignal.severity === 'medium' ? 'medium' : 'low',
          expectedOutcome:
            'Improve the quality of follow-up decisions by confirming whether current demand strength is temporary or repeatable.',
          affectedArea: demandSpikeSignal.affectedArea === 'orders' ? 'orders' : 'revenue',
          confidence: this.adjustConfidenceForTrust(demandSpikeSignal.confidence, trust),
          status: 'active',
          relatedSignalType: demandSpikeSignal.type,
          dedupeKey: 'capitalize_on_demand_spike',
          metadata: {
            sourceSignalIds: [demandSpikeSignal.id],
            sourceSignalFreshness: [demandSpikeSignal.freshnessStatus],
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (unusualChangeSignal) {
      recommendations.push(
        this.createRecommendation({
          type: 'validate_unusual_change',
          title: 'Validate unusual payment-side changes before escalating',
          summary: 'Confirm the root cause of the current payment anomaly before it is treated as a broader business issue.',
          rationale:
            'Unusual payment behavior should be validated before operators assume it reflects structural commercial deterioration.',
          evidence: unusualChangeSignal.evidence,
          urgency: unusualChangeSignal.severity === 'high' || unusualChangeSignal.severity === 'critical' ? 'high' : 'medium',
          expectedOutcome:
            'Reduce false urgency by separating temporary payment anomalies from broader commercial issues.',
          affectedArea: 'payments',
          confidence: this.adjustConfidenceForTrust(unusualChangeSignal.confidence, trust),
          status: 'active',
          relatedSignalType: unusualChangeSignal.type,
          dedupeKey: 'validate_unusual_change',
          metadata: {
            sourceSignalIds: [unusualChangeSignal.id],
            sourceSignalFreshness: [unusualChangeSignal.freshnessStatus],
          } as Prisma.InputJsonValue,
        }),
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        this.createRecommendation({
          type: 'capitalize_on_demand_spike',
          title: 'Maintain the current operating rhythm',
          summary: 'No high-priority advisory changes are active right now.',
          rationale:
            'Current revenue, customer, and integration conditions do not indicate a high-priority advisory review at this moment.',
          evidence: this.compactList([
            `Revenue today: ${this.formatCurrency(metrics.totalRevenueToday)}.`,
            `Orders today: ${metrics.totalOrdersToday}.`,
            `New customers today: ${metrics.totalNewCustomersToday}.`,
          ]),
          urgency: 'low',
          expectedOutcome:
            'Keep the team focused on monitoring rather than introducing unnecessary changes while current conditions remain stable.',
          affectedArea: 'revenue',
          confidence: this.adjustConfidenceForTrust('medium', trust),
          status: 'active',
          dedupeKey: 'maintain_operating_rhythm',
          metadata: {
            sourceSignalIds: [],
            sourceSignalFreshness: [],
          } as Prisma.InputJsonValue,
        }),
      );
    }

    return recommendations;
  }

  private adjustConfidenceForTrust(
    confidence: SignalConfidence,
    trust: CanonicalDataTrustStatus,
  ): SignalConfidence {
    if (trust.overallStatus === 'healthy') {
      return confidence;
    }

    if (trust.freshnessStatus === 'stale' || trust.coverageStatus === 'minimal') {
      return 'low';
    }

    if (confidence === 'high') {
      return 'medium';
    }

    return confidence;
  }

  private dedupeRecommendations(recommendations: RecommendationDraft[]) {
    const deduped = new Map<string, RecommendationDraft>();

    for (const recommendation of recommendations) {
      const existing = deduped.get(recommendation.dedupeKey);
      if (!existing || this.compareRecommendations(recommendation, existing) < 0) {
        deduped.set(recommendation.dedupeKey, recommendation);
      }
    }

    return [...deduped.values()];
  }

  private rankRecommendations(recommendations: RecommendationDraft[]) {
    return [...recommendations].sort((left, right) => this.compareRecommendations(left, right));
  }

  private compareRecommendations(
    left: {
      urgency: RecommendationUrgency;
      confidence: SignalConfidence;
      title: string;
      metadata?: Record<string, unknown> | Prisma.InputJsonValue | Prisma.JsonValue | null;
    },
    right: {
      urgency: RecommendationUrgency;
      confidence: SignalConfidence;
      title: string;
      metadata?: Record<string, unknown> | Prisma.InputJsonValue | Prisma.JsonValue | null;
    },
  ) {
    // 1. Primary: Urgency
    const urgencyDelta = this.scoreUrgency(right.urgency) - this.scoreUrgency(left.urgency);
    if (urgencyDelta !== 0) {
      return urgencyDelta;
    }

    // 2. Secondary: Historical Effectiveness (Learning Signal)
    const leftMetadata = this.asRecord(left.metadata);
    const rightMetadata = this.asRecord(right.metadata);
    const leftEffectiveness = Number(leftMetadata?.historicalEffectiveness ?? 1.0);
    const rightEffectiveness = Number(rightMetadata?.historicalEffectiveness ?? 1.0);
    const leftBias = Number(leftMetadata?.decisionBias ?? 1.0);
    const rightBias = Number(rightMetadata?.decisionBias ?? 1.0);

    const effectivenessDelta = (rightEffectiveness * rightBias) - (leftEffectiveness * leftBias);
    if (Math.abs(effectivenessDelta) > 0.05) {
      return effectivenessDelta > 0 ? 1 : -1;
    }

    // 3. Tertiary: Confidence
    const confidenceDelta = this.scoreConfidence(right.confidence) - this.scoreConfidence(left.confidence);
    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }

    const freshnessDelta =
      this.scoreFreshness(this.getRecommendationFreshness(right)) -
      this.scoreFreshness(this.getRecommendationFreshness(left));
    if (freshnessDelta !== 0) {
      return freshnessDelta;
    }

    return left.title.localeCompare(right.title);
  }

  private async persistRecommendations(
    organizationId: string,
    recommendations: RecommendationDraft[],
    forceRefresh: boolean,
  ) {
    const existingRecommendations = await this.prismaService.aiRecommendation.findMany({
      where: {
        organizationId,
        isActive: true,
        category: { in: [...MANAGED_RECOMMENDATION_TYPES] },
      },
      orderBy: [{ createdAt: 'desc' }, { updatedAt: 'desc' }],
    });

    const existingViews = existingRecommendations.map((recommendation) =>
      this.toRecommendationView(recommendation),
    );
    const existingFingerprints = existingRecommendations
      .map((recommendation) => this.asString(this.asRecord(recommendation.metadata)?.fingerprint))
      .filter((value): value is string => Boolean(value))
      .sort();
    const draftFingerprints = recommendations.map((recommendation) => recommendation.fingerprint).sort();
    const unchanged =
      !forceRefresh &&
      existingRecommendations.length === recommendations.length &&
      existingFingerprints.length === draftFingerprints.length &&
      existingFingerprints.every((value, index) => value === draftFingerprints[index]);

    if (unchanged) {
      return this.sortRecommendationViews(existingViews);
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.aiRecommendation.updateMany({
        where: {
          organizationId,
          category: { in: [...MANAGED_RECOMMENDATION_TYPES] },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      for (const recommendation of recommendations) {
        await tx.aiRecommendation.create({
          data: {
            organizationId,
            category: recommendation.type,
            priority: this.toPriority(recommendation.urgency),
            title: recommendation.title,
            description: recommendation.summary,
            rationale: recommendation.rationale,
            relatedSignalType: recommendation.relatedSignalType ?? null,
            metadata: {
              type: recommendation.type,
              summary: recommendation.summary,
              evidence: recommendation.evidence,
              urgency: recommendation.urgency,
              expectedOutcome: recommendation.expectedOutcome,
              affectedArea: recommendation.affectedArea,
              confidence: recommendation.confidence,
              status: recommendation.status,
              fingerprint: recommendation.fingerprint,
              dedupeKey: recommendation.dedupeKey,
              ...(this.asRecord(recommendation.metadata) ?? {}),
            } as Prisma.InputJsonValue,
            isActive: recommendation.status === 'active',
          },
        });
      }
    });

    await this.aiNotificationService.generateNotificationsForOrganization(organizationId, {
      recommendations: recommendations.map((recommendation) => ({
        category: recommendation.type,
        priority: this.toPriority(recommendation.urgency),
        title: recommendation.title,
        description: recommendation.summary,
      })),
    });

    const persistedRecommendations = await this.prismaService.aiRecommendation.findMany({
      where: {
        organizationId,
        isActive: true,
        category: { in: [...MANAGED_RECOMMENDATION_TYPES] },
      },
    });

    return this.sortRecommendationViews(
      persistedRecommendations.map((recommendation) => this.toRecommendationView(recommendation)),
    );
  }

  private applyFilters(recommendations: CanonicalAiRecommendation[], query: QueryAiRecommendationsDto) {
    return recommendations.filter((recommendation) => {
      if (query.type && recommendation.type !== query.type) {
        return false;
      }
      if (query.urgency && recommendation.urgency !== query.urgency) {
        return false;
      }
      if (query.affectedArea && recommendation.affectedArea !== query.affectedArea) {
        return false;
      }
      if (query.confidence && recommendation.confidence !== query.confidence) {
        return false;
      }
      if (query.status && recommendation.status !== query.status) {
        return false;
      }
      return true;
    });
  }

  private sortRecommendationViews(recommendations: CanonicalAiRecommendation[]) {
    return [...recommendations].sort((left, right) => this.compareRecommendations(left, right));
  }

  private toRecommendationView(recommendation: {
    id: string;
    organizationId: string;
    category: string;
    priority: string;
    title: string;
    description: string;
    rationale: string;
    relatedSignalType: string | null;
    metadata: Prisma.JsonValue | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CanonicalAiRecommendation {
    const metadata = this.asRecord(recommendation.metadata);
    const urgency = this.normalizeUrgency(this.asString(metadata?.urgency), recommendation.priority);

    return {
      id: recommendation.id,
      organizationId: recommendation.organizationId,
      type: this.asString(metadata?.type) ?? recommendation.category,
      category: recommendation.category,
      title: recommendation.title,
      summary: this.asString(metadata?.summary) ?? recommendation.description,
      description: recommendation.description,
      rationale: recommendation.rationale,
      evidence: this.asStringArray(metadata?.evidence),
      urgency,
      priority: this.toPriority(urgency),
      expectedOutcome:
        this.asString(metadata?.expectedOutcome) ??
        'Support better operator decisions by clarifying what to review next.',
      affectedArea: this.normalizeAffectedArea(this.asString(metadata?.affectedArea)),
      confidence: this.normalizeConfidence(this.asString(metadata?.confidence)),
      status: this.normalizeStatus(this.asString(metadata?.status), recommendation.isActive),
      relatedSignalType: recommendation.relatedSignalType,
      metadata,
      isActive: recommendation.isActive,
      createdAt: recommendation.createdAt.toISOString(),
      updatedAt: recommendation.updatedAt.toISOString(),
    };
  }

  private createRecommendation(input: Omit<RecommendationDraft, 'fingerprint'>): RecommendationDraft {
    const fingerprint = JSON.stringify({
      type: input.type,
      summary: input.summary,
      rationale: input.rationale,
      evidence: input.evidence,
      urgency: input.urgency,
      expectedOutcome: input.expectedOutcome,
      affectedArea: input.affectedArea,
      confidence: input.confidence,
      status: input.status,
      dedupeKey: input.dedupeKey,
    });

    return {
      ...input,
      fingerprint,
    };
  }

  private getRecommendationFreshness(recommendation: {
    metadata?: Record<string, unknown> | Prisma.InputJsonValue | Prisma.JsonValue | null;
  }): SignalFreshnessStatus {
    const metadata = this.asRecord(recommendation.metadata);
    const sourceSignalFreshness = this.asStringArray(metadata?.sourceSignalFreshness);
    if (sourceSignalFreshness.includes('stale')) {
      return 'stale';
    }
    if (sourceSignalFreshness.includes('delayed')) {
      return 'delayed';
    }
    return 'fresh';
  }

  private scoreUrgency(value: RecommendationUrgency) {
    return value === 'high' ? 3 : value === 'medium' ? 2 : 1;
  }

  private scoreConfidence(value: SignalConfidence) {
    return value === 'high' ? 3 : value === 'medium' ? 2 : 1;
  }

  private scoreFreshness(value: SignalFreshnessStatus) {
    return value === 'fresh' ? 3 : value === 'delayed' ? 2 : 1;
  }

  private normalizeUrgency(value: string | null, priority: string): RecommendationUrgency {
    if (value === 'high' || value === 'medium') {
      return value;
    }

    return priority === 'HIGH' || priority === 'CRITICAL'
      ? 'high'
      : priority === 'MEDIUM'
        ? 'medium'
        : 'low';
  }

  private normalizeAffectedArea(value: string | null): RecommendationAffectedArea {
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

  private normalizeConfidence(value: string | null): SignalConfidence {
    return value === 'high' || value === 'medium' ? value : 'low';
  }

  private normalizeStatus(value: string | null, isActive: boolean): RecommendationStatus {
    if (value === 'archived' || value === 'superseded') {
      return value;
    }

    return isActive ? 'active' : 'archived';
  }

  private toPriority(urgency: RecommendationUrgency) {
    return urgency === 'high' ? 'HIGH' : urgency === 'medium' ? 'MEDIUM' : 'LOW';
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

  private asRecord(value: unknown) {
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
}
