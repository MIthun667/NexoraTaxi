import { Injectable } from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { QueryAiOrganizationDto } from './dto/query-ai-organization.dto';

export type DataTrustOverallStatus = 'healthy' | 'limited' | 'issue_detected' | 'not_connected';
export type DataTrustShopifyStatus =
  | 'connected'
  | 'limited'
  | 'delayed'
  | 'stale'
  | 'failed'
  | 'not_connected';
export type DataTrustStripeStatus =
  | 'connected'
  | 'delayed'
  | 'stale'
  | 'failed'
  | 'not_connected'
  | 'not_applicable';
export type DataTrustFreshnessStatus = 'up_to_date' | 'delayed' | 'stale';
export type DataTrustCoverageStatus = 'full' | 'partial' | 'minimal' | 'unavailable';

export type CanonicalDataTrustStatus = {
  overallStatus: DataTrustOverallStatus;
  shopifyStatus: DataTrustShopifyStatus;
  stripeStatus: DataTrustStripeStatus;
  freshnessStatus: DataTrustFreshnessStatus;
  coverageStatus: DataTrustCoverageStatus;
  limitations: string[];
  evidence: string[];
  recommendedOperatorMessage: string;
  updatedAt: string;
  integrations: {
    shopify: {
      connected: boolean;
      storeId: string | null;
      shopDomain: string | null;
      latestSyncStatus: string | null;
      latestSyncAt: string | null;
      lastSuccessfulSyncAt: string | null;
      productsAvailable: boolean;
      ordersAvailable: boolean;
      customersAvailable: boolean;
      protectedCustomerDataRequired: boolean;
    };
    stripe: {
      connected: boolean;
      accountId: string | null;
      latestSyncStatus: string | null;
      latestSyncAt: string | null;
      lastSuccessfulSyncAt: string | null;
      paymentsAvailable: boolean;
    };
  };
};

type FreshnessEvaluation = {
  status: DataTrustFreshnessStatus;
  ageHours: number | null;
};

const FRESH_SYNC_THRESHOLD_HOURS = 6;
const STALE_SYNC_THRESHOLD_HOURS = 24;

@Injectable()
export class AiDataTrustService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
  ) {}

  async getDataTrust(principal: CurrentPrincipal, query: QueryAiOrganizationDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const trust = await this.getTrustForOrganization(organizationId);

    return buildSuccessResponse('Data trust status retrieved successfully.', trust);
  }

  async refreshDataTrust(principal: CurrentPrincipal, dto: QueryAiOrganizationDto) {
    return this.getDataTrust(principal, dto);
  }

  async getTrustForOrganization(organizationId: string): Promise<CanonicalDataTrustStatus> {
    const now = new Date();
    const [
      metrics,
      store,
      latestStoreSyncRun,
      latestSuccessfulStoreSyncRun,
      stripeAccount,
      latestStripeSyncRun,
      latestSuccessfulStripeSyncRun,
    ] = await Promise.all([
      this.aiCommerceMetricsService.getCommerceOverviewMetrics(organizationId),
      this.prismaService.integrationShopifyStore.findFirst({
        where: { organizationId, isActive: true },
        orderBy: { installedAt: 'desc' },
        select: { id: true, shopDomain: true },
      }),
      this.prismaService.shopifySyncRun.findFirst({
        where: { organizationId },
        orderBy: { startedAt: 'desc' },
        select: { status: true, startedAt: true, completedAt: true },
      }),
      this.prismaService.shopifySyncRun.findFirst({
        where: { organizationId, status: { in: ['SUCCEEDED', 'PARTIAL_SUCCESS'] } },
        orderBy: { completedAt: 'desc' },
        select: { status: true, startedAt: true, completedAt: true },
      }),
      this.prismaService.integrationStripeAccount.findFirst({
        where: { organizationId, isActive: true },
        orderBy: { connectedAt: 'desc' },
        select: { id: true },
      }),
      this.prismaService.stripeSyncRun.findFirst({
        where: { organizationId },
        orderBy: { startedAt: 'desc' },
        select: { status: true, startedAt: true, completedAt: true },
      }),
      this.prismaService.stripeSyncRun.findFirst({
        where: { organizationId, status: 'SUCCEEDED' },
        orderBy: { completedAt: 'desc' },
        select: { status: true, startedAt: true, completedAt: true },
      }),
    ]);

    const shopifyLatestAt = latestStoreSyncRun?.completedAt ?? latestStoreSyncRun?.startedAt ?? null;
    const stripeLatestAt = latestStripeSyncRun?.completedAt ?? latestStripeSyncRun?.startedAt ?? null;
    const shopifySuccessfulAt =
      latestSuccessfulStoreSyncRun?.completedAt ?? latestSuccessfulStoreSyncRun?.startedAt ?? null;
    const stripeSuccessfulAt =
      latestSuccessfulStripeSyncRun?.completedAt ?? latestSuccessfulStripeSyncRun?.startedAt ?? null;
    const shopifyFreshness = this.evaluateFreshness(
      latestStoreSyncRun?.status ?? null,
      shopifySuccessfulAt,
      now,
      !store,
    );
    const stripeFreshness = this.evaluateFreshness(
      latestStripeSyncRun?.status ?? null,
      stripeSuccessfulAt,
      now,
      !stripeAccount,
    );

    const productsAvailable = Boolean(store);
    const ordersAvailable = Boolean(store) && !metrics.protectedCustomerDataRequired;
    const customersAvailable = Boolean(store) && !metrics.protectedCustomerDataRequired;
    const coverageCount = [productsAvailable, ordersAvailable, customersAvailable].filter(Boolean).length;
    const coverageStatus: DataTrustCoverageStatus =
      !store
        ? 'unavailable'
        : coverageCount === 3
          ? 'full'
          : coverageCount === 2
            ? 'partial'
            : coverageCount === 1
              ? 'minimal'
              : 'unavailable';

    const shopifyStatus: DataTrustShopifyStatus =
      !store
        ? 'not_connected'
        : latestStoreSyncRun?.status === 'FAILED'
          ? 'failed'
          : shopifyFreshness.status === 'stale'
            ? 'stale'
            : shopifyFreshness.status === 'delayed'
              ? 'delayed'
              : metrics.shopifyLimitedAccess || coverageStatus !== 'full'
                ? 'limited'
                : 'connected';

    const stripeStatus: DataTrustStripeStatus =
      !stripeAccount
        ? 'not_connected'
        : latestStripeSyncRun?.status === 'FAILED'
          ? 'failed'
          : stripeFreshness.status === 'stale'
            ? 'stale'
            : stripeFreshness.status === 'delayed'
              ? 'delayed'
              : 'connected';

    const freshnessStatus: DataTrustFreshnessStatus =
      !store || shopifyFreshness.status === 'stale' || stripeStatus === 'failed' || stripeFreshness.status === 'stale'
        ? 'stale'
        : shopifyFreshness.status === 'delayed' || stripeFreshness.status === 'delayed'
          ? 'delayed'
          : 'up_to_date';

    const overallStatus: DataTrustOverallStatus =
      !store
        ? 'not_connected'
        : shopifyStatus === 'failed' || stripeStatus === 'failed' || freshnessStatus === 'stale'
          ? 'issue_detected'
          : coverageStatus !== 'full' || stripeStatus === 'not_connected' || freshnessStatus === 'delayed'
            ? 'limited'
            : 'healthy';

    const evidence = this.compactList([
      !store ? 'No active Shopify store is connected.' : `Shopify store ${store.shopDomain} is connected.`,
      shopifySuccessfulAt
        ? `Shopify sync last succeeded ${this.formatRelativeHours(shopifyFreshness.ageHours)}.`
        : store
          ? 'No successful Shopify sync has been recorded yet.'
          : null,
      stripeAccount
        ? stripeSuccessfulAt
          ? `Stripe sync last succeeded ${this.formatRelativeHours(stripeFreshness.ageHours)}.`
          : 'Stripe is connected, but no successful payment sync has been recorded yet.'
        : 'Payments visibility is unavailable because Stripe is not connected.',
      coverageStatus === 'full'
        ? 'Products, orders, and customers are currently available.'
        : coverageStatus === 'partial'
          ? 'Some store domains are available, but coverage is still partial.'
          : coverageStatus === 'minimal'
            ? 'Only limited store coverage is currently available.'
            : store
              ? 'Store coverage is currently unavailable.'
              : null,
    ]);

    const limitations = this.compactList([
      !store ? 'Commerce insights are unavailable until a store is connected.' : null,
      store && !shopifySuccessfulAt
        ? 'Trend comparisons may be incomplete until the first successful Shopify sync finishes.'
        : null,
      freshnessStatus === 'delayed'
        ? 'Recent changes may not be fully reflected yet.'
        : null,
      freshnessStatus === 'stale'
        ? 'Recent changes may be outdated until source data is refreshed.'
        : null,
      coverageStatus === 'partial'
        ? 'Some insights are limited because parts of your store data are not yet available.'
        : null,
      coverageStatus === 'minimal'
        ? 'Customer and order visibility is limited until broader Shopify access is available.'
        : null,
      !stripeAccount
        ? 'Payments-related insights are limited until payments are connected.'
        : null,
      stripeStatus === 'failed' || stripeStatus === 'stale' || stripeStatus === 'delayed'
        ? 'Payments-related trends may be incomplete until payment data is current.'
        : null,
    ]);

    return {
      overallStatus,
      shopifyStatus,
      stripeStatus,
      freshnessStatus,
      coverageStatus,
      limitations,
      evidence,
      recommendedOperatorMessage: this.buildRecommendedOperatorMessage({
        hasStore: Boolean(store),
        hasSuccessfulStoreSync: Boolean(shopifySuccessfulAt),
        freshnessStatus,
        coverageStatus,
        stripeStatus,
      }),
      updatedAt: now.toISOString(),
      integrations: {
        shopify: {
          connected: Boolean(store),
          storeId: store?.id ?? null,
          shopDomain: store?.shopDomain ?? null,
          latestSyncStatus: latestStoreSyncRun?.status ?? null,
          latestSyncAt: shopifyLatestAt?.toISOString() ?? null,
          lastSuccessfulSyncAt: shopifySuccessfulAt?.toISOString() ?? null,
          productsAvailable,
          ordersAvailable,
          customersAvailable,
          protectedCustomerDataRequired: metrics.protectedCustomerDataRequired,
        },
        stripe: {
          connected: Boolean(stripeAccount),
          accountId: stripeAccount?.id ?? null,
          latestSyncStatus: latestStripeSyncRun?.status ?? null,
          latestSyncAt: stripeLatestAt?.toISOString() ?? null,
          lastSuccessfulSyncAt: stripeSuccessfulAt?.toISOString() ?? null,
          paymentsAvailable: Boolean(stripeAccount),
        },
      },
    };
  }

  private buildRecommendedOperatorMessage(input: {
    hasStore: boolean;
    hasSuccessfulStoreSync: boolean;
    freshnessStatus: DataTrustFreshnessStatus;
    coverageStatus: DataTrustCoverageStatus;
    stripeStatus: DataTrustStripeStatus;
  }) {
    if (!input.hasStore) {
      return 'Connect your store to enable insights.';
    }

    if (!input.hasSuccessfulStoreSync) {
      return 'Your store is connected, but initial data is still being collected.';
    }

    if (input.freshnessStatus === 'delayed' || input.freshnessStatus === 'stale') {
      return 'Data is delayed. Recent changes may not be fully reflected yet.';
    }

    if (input.coverageStatus === 'partial' || input.coverageStatus === 'minimal') {
      return 'Some insights are limited because parts of your store data are not yet available.';
    }

    if (input.stripeStatus === 'not_connected') {
      return 'Payments-related insights are limited until payments are connected.';
    }

    return 'Data is current.';
  }

  private evaluateFreshness(
    latestStatus: string | null,
    lastSuccessfulAt: Date | null,
    now: Date,
    notConnected: boolean,
  ): FreshnessEvaluation {
    if (notConnected || latestStatus === 'FAILED' || !lastSuccessfulAt) {
      return { status: 'stale', ageHours: null };
    }

    const ageHours = (now.getTime() - lastSuccessfulAt.getTime()) / (1000 * 60 * 60);

    if (ageHours <= FRESH_SYNC_THRESHOLD_HOURS) {
      return { status: 'up_to_date', ageHours };
    }

    if (ageHours <= STALE_SYNC_THRESHOLD_HOURS) {
      return { status: 'delayed', ageHours };
    }

    return { status: 'stale', ageHours };
  }

  private formatRelativeHours(ageHours: number | null) {
    if (ageHours === null) {
      return 'recently';
    }

    const roundedHours = Math.max(1, Math.floor(ageHours));
    return `${roundedHours} hour${roundedHours === 1 ? '' : 's'} ago`;
  }

  private compactList(values: Array<string | null | undefined>) {
    const seen = new Set<string>();

    return values
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .filter((value) => {
        const normalized = value.toLowerCase();
        if (seen.has(normalized)) {
          return false;
        }
        seen.add(normalized);
        return true;
      });
  }
}
