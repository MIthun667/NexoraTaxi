import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiDataTrustService } from './ai-data-trust.service';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { AiDailyBriefService } from './ai-daily-brief.service';
import { AiRecommendationService } from './ai-recommendation.service';
import { AiSignalService, CanonicalAiSignal } from './ai-signal.service';

type ProposalDraft = {
  proposalType: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  metadata: Prisma.InputJsonValue;
  dedupeKey: string;
};

const ENGINE_SOURCE = 'deterministic_engine';
const ACTIVE_GENERATED_STATUSES = ['PENDING', 'IN_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'DEFERRED'] as const;

@Injectable()
export class AiActionProposalEngineService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiDataTrustService: AiDataTrustService,
    private readonly aiDailyBriefService: AiDailyBriefService,
    private readonly aiSignalService: AiSignalService,
    private readonly aiRecommendationService: AiRecommendationService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async ensureCurrentProposals(
    principal: CurrentPrincipal,
    organizationId: string,
    forceRefresh = false,
  ) {
    const drafts = await this.buildDrafts(principal, organizationId);
    const proposals = await this.persistDrafts(organizationId, drafts, forceRefresh);

    this.logger.debug({
      event: 'ai.action_proposals.generated',
      organizationId,
      proposalTypes: proposals.map((proposal) => proposal.proposalType),
      count: proposals.length,
    });

    return proposals;
  }

  toProposalView<
    T extends {
      id: string;
      proposalType: string;
      title: string;
      description: string;
      status: string;
      source: string;
      priority: string;
      latestDecisionNote: string | null;
      metadata: Prisma.JsonValue | null;
    },
  >(proposal: T) {
    const metadata = this.asRecord(proposal.metadata);
    const evidence = this.asStringArray(metadata?.evidence);
    const safetyNotes = this.asStringArray(metadata?.safetyNotes);

    return {
      ...proposal,
      type: this.asString(metadata?.type) ?? proposal.proposalType,
      summary: this.asString(metadata?.summary) ?? proposal.description,
      reason:
        this.asString(metadata?.reason) ??
        this.asString(metadata?.rationale) ??
        proposal.latestDecisionNote ??
        proposal.description,
      evidence,
      targetEntityType: this.asString(metadata?.targetEntityType),
      targetEntityId: this.asString(metadata?.targetEntityId),
      riskLevel: this.asString(metadata?.riskLevel) ?? this.priorityToRiskLevel(proposal.priority),
      recommendedBy: this.asString(metadata?.recommendedBy) ?? proposal.source,
      safetyNotes,
    };
  }

  private async buildDrafts(principal: CurrentPrincipal, organizationId: string) {
    const [metrics, signals, recommendationsResponse, dailyBriefResponse, trust] =
      await Promise.all([
        this.aiCommerceMetricsService.getCommerceOverviewMetrics(organizationId),
        this.aiSignalService.getCanonicalSignals(principal, { organizationId }),
        this.aiRecommendationService.listRecommendations(principal, { organizationId }),
        this.aiDailyBriefService.getDailyBrief(principal, { organizationId }),
        this.aiDataTrustService.getTrustForOrganization(organizationId),
      ]);

    const canonicalSignals = signals as CanonicalAiSignal[];
    const recommendations = recommendationsResponse.data as Array<{
      id: string;
      category: string;
      priority: string;
      title: string;
      description: string;
      rationale: string;
      relatedSignalType?: string | null;
    }>;
    const dailyBrief = dailyBriefResponse.data as {
      summary: string;
      signals: string[];
      risks: string[];
      actions: string[];
    };
    const topProductId = metrics.topProduct?.productId ?? null;
    const revenueDropSignal = canonicalSignals.find((signal) =>
      ['revenue_drop', 'order_slowdown', 'unusual_change'].includes(signal.type) &&
      ['revenue', 'orders', 'payments'].includes(signal.affectedArea),
    );
    const customerDeclineSignal = canonicalSignals.find((signal) =>
      signal.type === 'customer_slowdown',
    );
    const productAnomalySignal = canonicalSignals.find((signal) =>
      signal.type === 'product_concentration_risk',
    );
    const drafts: ProposalDraft[] = [];

    if (trust.shopifyStatus === 'failed' || trust.shopifyStatus === 'stale') {
      drafts.push({
        proposalType: 'review_store_sync_issue',
        title: 'Investigate store sync health',
        description: 'Review why current store data may be delayed or incomplete before taking downstream actions.',
        priority: trust.shopifyStatus === 'failed' ? 'HIGH' : 'MEDIUM',
        dedupeKey: 'review_store_sync_issue',
        metadata: {
          type: 'review_store_sync_issue',
          summary: 'Investigate store sync health before relying on today’s store insight.',
          reason:
            trust.shopifyStatus === 'failed'
              ? 'The latest Shopify sync failed.'
              : 'Store data is stale or has not completed a recent sync.',
          evidence: this.compactEvidence([
            ...trust.evidence.filter((item) => item.toLowerCase().includes('shopify')),
            ...dailyBrief.risks.slice(0, 1),
          ]),
          targetEntityType: 'store',
          targetEntityId: trust.integrations.shopify.storeId,
          riskLevel: trust.shopifyStatus === 'failed' ? 'high' : 'medium',
          recommendedBy: 'data_trust_engine',
          safetyNotes: [
            'Requires human review.',
            'No direct external system write occurs until a reviewer approves follow-up action.',
          ],
        } as Prisma.InputJsonValue,
      });
    }

    if (trust.coverageStatus === 'partial' || trust.coverageStatus === 'minimal') {
      drafts.push({
        proposalType: 'review_visibility_gap',
        title: 'Review commerce visibility gap',
        description: 'Resolve the current Shopify visibility limitation before relying on customer or order-driven insight.',
        priority: 'MEDIUM',
        dedupeKey: 'review_visibility_gap',
        metadata: {
          type: 'review_visibility_gap',
          summary: 'Review the current Shopify visibility gap.',
          reason: 'Protected Shopify customer or order data is still limited.',
          evidence: this.compactEvidence([
            ...trust.evidence,
            ...trust.limitations,
          ]),
          targetEntityType: 'store',
          targetEntityId: trust.integrations.shopify.storeId,
          riskLevel: 'medium',
          recommendedBy: 'data_trust_engine',
          safetyNotes: [
            'Requires human review.',
            'This proposal only recommends resolving data visibility before other actions.',
          ],
        } as Prisma.InputJsonValue,
      });
    }

    if (trust.stripeStatus === 'not_connected' || trust.stripeStatus === 'failed' || trust.stripeStatus === 'stale') {
      drafts.push({
        proposalType: 'review_payment_connection',
        title: 'Review payment visibility gap',
        description: 'Confirm that payment visibility is connected and healthy so revenue risk can be assessed accurately.',
        priority: trust.stripeStatus === 'failed' ? 'HIGH' : 'MEDIUM',
        dedupeKey: 'review_payment_connection',
        metadata: {
          type: 'review_payment_connection',
          summary: 'Review the current payment visibility gap.',
          reason: trust.stripeStatus === 'not_connected'
            ? 'Stripe is not connected.'
            : 'The latest Stripe sync needs attention.',
          evidence: this.compactEvidence([
            ...trust.evidence.filter((item) => item.toLowerCase().includes('stripe') || item.toLowerCase().includes('payment')),
            ...dailyBrief.risks.filter((risk) => risk.toLowerCase().includes('payment')).slice(0, 1),
          ]),
          targetEntityType: 'payments',
          targetEntityId: trust.integrations.stripe.accountId,
          riskLevel: trust.stripeStatus === 'failed' ? 'high' : 'medium',
          recommendedBy: 'data_trust_engine',
          safetyNotes: [
            'Requires human review.',
            'No payment settings are changed automatically.',
          ],
        } as Prisma.InputJsonValue,
      });
    }

    if (
      revenueDropSignal ||
      (metrics.changes.revenueChangeRatio !== null && metrics.changes.revenueChangeRatio <= -0.2) ||
      (metrics.changes.orderChangeRatio !== null && metrics.changes.orderChangeRatio <= -0.2)
    ) {
      drafts.push({
        proposalType: 'investigate_metric_drop',
        title: 'Investigate revenue and order decline',
        description: 'Review the current revenue and order slowdown before it compounds into a larger performance issue.',
        priority:
          revenueDropSignal?.severity === 'high' ||
          revenueDropSignal?.severity === 'critical' ||
          (metrics.changes.revenueChangeRatio !== null && metrics.changes.revenueChangeRatio <= -0.35)
            ? 'HIGH'
            : 'MEDIUM',
        dedupeKey: 'investigate_metric_drop',
        metadata: {
          type: 'investigate_metric_drop',
          summary: 'Investigate the current revenue and order decline.',
          reason: revenueDropSignal?.reason ?? 'Revenue or order volume is lower than the previous window.',
          evidence: this.compactEvidence([
            metrics.changes.revenueChangeRatio !== null
              ? `Revenue changed ${this.formatSignedPercent(metrics.changes.revenueChangeRatio)} versus the previous 24-hour window.`
              : null,
            metrics.changes.orderChangeRatio !== null
              ? `Orders changed ${this.formatSignedPercent(metrics.changes.orderChangeRatio)} versus the previous 24-hour window.`
              : null,
            ...dailyBrief.signals.slice(0, 1),
          ]),
          targetEntityType: 'organization',
          targetEntityId: organizationId,
          riskLevel:
            revenueDropSignal?.severity === 'high' ||
            revenueDropSignal?.severity === 'critical' ||
            (metrics.changes.revenueChangeRatio !== null && metrics.changes.revenueChangeRatio <= -0.35)
              ? 'high'
              : 'medium',
          recommendedBy: 'daily_brief_engine',
          safetyNotes: [
            'Requires human review.',
            'This proposal only recommends investigation and review.',
          ],
        } as Prisma.InputJsonValue,
      });
    }

    if (
      customerDeclineSignal ||
      (metrics.totalNewCustomersToday === 0 && metrics.previous24h.newCustomers > 0)
    ) {
      drafts.push({
        proposalType: 'monitor_customer_decline',
        title: 'Review customer slowdown',
        description: 'Check whether customer acquisition or repeat demand has softened enough to require intervention.',
        priority:
          customerDeclineSignal?.severity === 'high' || customerDeclineSignal?.severity === 'critical'
            ? 'HIGH'
            : 'MEDIUM',
        dedupeKey: 'monitor_customer_decline',
        metadata: {
          type: 'monitor_customer_decline',
          summary: 'Review the current customer slowdown.',
          reason:
            customerDeclineSignal?.reason ??
            'Customer activity is softer than the previous window.',
          evidence: this.compactEvidence([
            ...(customerDeclineSignal?.evidence ?? []),
            metrics.totalNewCustomersToday === 0 && metrics.previous24h.newCustomers > 0
              ? `No new customers have been recorded today after ${metrics.previous24h.newCustomers} in the previous 24-hour window.`
              : null,
            ...dailyBrief.signals.filter((signal) => signal.toLowerCase().includes('customer')).slice(0, 1),
          ]),
          targetEntityType: 'customer_segment',
          targetEntityId: organizationId,
          riskLevel:
            customerDeclineSignal?.severity === 'high' || customerDeclineSignal?.severity === 'critical'
              ? 'high'
              : 'medium',
          recommendedBy: 'daily_brief_engine',
          safetyNotes: [
            'Requires human review.',
            'No customer communication is triggered automatically.',
          ],
        } as Prisma.InputJsonValue,
      });
    }

    if (productAnomalySignal && topProductId) {
      drafts.push({
        proposalType: 'inspect_product_anomaly',
        title: 'Inspect product concentration risk',
        description: 'Review whether current product concentration or product-led dependency deserves action.',
        priority:
          productAnomalySignal.severity === 'high' || productAnomalySignal.severity === 'critical'
            ? 'HIGH'
            : 'LOW',
        dedupeKey: `inspect_product_anomaly:${topProductId}`,
        metadata: {
          type: 'inspect_product_anomaly',
          summary: 'Inspect the current product concentration or product anomaly.',
          reason: productAnomalySignal.reason,
          evidence: this.compactEvidence([
            ...productAnomalySignal.evidence,
            metrics.topProduct
              ? `${metrics.topProduct.title} is the current top product with ${metrics.topProduct.unitsSold} units sold.`
              : null,
            ...recommendations
              .filter((recommendation) => recommendation.category === 'product-concentration')
              .slice(0, 1)
              .map((recommendation) => recommendation.rationale),
          ]),
          targetEntityType: 'product',
          targetEntityId: topProductId,
          riskLevel:
            productAnomalySignal.severity === 'high' || productAnomalySignal.severity === 'critical'
              ? 'high'
              : 'low',
          recommendedBy: 'daily_brief_engine',
          safetyNotes: [
            'Requires human review.',
            'No catalog or pricing changes happen automatically.',
          ],
        } as Prisma.InputJsonValue,
      });
    }

    return this.dedupeDrafts(drafts).slice(0, 5);
  }

  private async persistDrafts(
    organizationId: string,
    drafts: ProposalDraft[],
    forceRefresh: boolean,
  ) {
    const existingGenerated = await this.prismaService.actionProposal.findMany({
      where: {
        organizationId,
        source: ENGINE_SOURCE,
      },
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const activeExisting = existingGenerated.filter((proposal) =>
      ACTIVE_GENERATED_STATUSES.includes(
        proposal.status as (typeof ACTIVE_GENERATED_STATUSES)[number],
      ),
    );
    const usedIds = new Set<string>();

    for (const draft of drafts) {
      const existing = activeExisting.find((proposal) => {
        const metadata = this.asRecord(proposal.metadata);
        return (
          this.asString(metadata?.dedupeKey) === draft.dedupeKey ||
          proposal.proposalType === draft.proposalType
        );
      });

      if (existing) {
        usedIds.add(existing.id);
        await this.prismaService.actionProposal.update({
          where: { id: existing.id },
          data: {
            proposalType: draft.proposalType,
            title: draft.title,
            description: draft.description,
            priority: draft.priority,
            metadata: draft.metadata,
          },
        });
        continue;
      }

      const created = await this.prismaService.actionProposal.create({
        data: {
          organizationId,
          proposalType: draft.proposalType,
          title: draft.title,
          description: draft.description,
          status: 'PENDING',
          source: ENGINE_SOURCE,
          priority: draft.priority,
          metadata: draft.metadata,
          latestDecisionNote: null,
        },
      });
      usedIds.add(created.id);
    }

    const stale = activeExisting.filter((proposal) => !usedIds.has(proposal.id));
    if (forceRefresh && stale.length > 0) {
      await this.prismaService.actionProposal.updateMany({
        where: {
          id: { in: stale.map((proposal) => proposal.id) },
        },
        data: {
          status: 'ARCHIVED',
        },
      });
    }

    const proposals = await this.prismaService.actionProposal.findMany({
      where: {
        organizationId,
        status: { not: 'ARCHIVED' },
      },
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return proposals;
  }

  private dedupeDrafts(drafts: ProposalDraft[]) {
    const seen = new Set<string>();
    return drafts.filter((draft) => {
      if (seen.has(draft.dedupeKey)) {
        return false;
      }
      seen.add(draft.dedupeKey);
      return true;
    });
  }

  private compactEvidence(items: Array<string | null | undefined>) {
    const seen = new Set<string>();

    return items
      .map((item) => item?.trim())
      .filter((item): item is string => Boolean(item))
      .filter((item) => {
        const normalized = item.toLowerCase();
        if (seen.has(normalized)) {
          return false;
        }
        seen.add(normalized);
        return true;
      });
  }

  private asRecord(value: Prisma.JsonValue | Prisma.InputJsonValue | undefined | null) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private asString(value: unknown) {
    return typeof value === 'string' ? value : null;
  }

  private asStringArray(value: unknown) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private priorityToRiskLevel(priority: string) {
    if (priority === 'HIGH' || priority === 'CRITICAL') {
      return 'high';
    }
    if (priority === 'MEDIUM') {
      return 'medium';
    }
    return 'low';
  }

  private formatSignedPercent(value: number) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(0)}%`;
  }
}
