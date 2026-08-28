import { Injectable, NotFoundException } from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { ShopifySyncService } from '../integrations/shopify/shopify-sync.service';
import { StripeSyncService } from '../integrations/stripe/stripe-sync.service';
import {
  AiDataTrustService,
  CanonicalDataTrustStatus,
  DataTrustCoverageStatus,
  DataTrustShopifyStatus,
  DataTrustStripeStatus,
} from './ai-data-trust.service';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { ManageConnectedStoreDto } from './dto/manage-connected-store.dto';
import { QueryAiOrganizationDto } from './dto/query-ai-organization.dto';

export type ConnectedStoreConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'attention_required'
  | 'not_connected';

export type ConnectedStoreLatestSyncState =
  | 'success'
  | 'in_progress'
  | 'delayed'
  | 'failed'
  | 'never_synced'
  | 'not_connected';

export type ConnectedStoreAvailableAction =
  | 'reconnect_store'
  | 'retry_shopify_sync'
  | 'retry_stripe_sync'
  | 'review_permissions'
  | 'connect_payments'
  | 'wait_for_initial_sync';

export type ConnectedStoreStatus = {
  storeId: string;
  storeName: string;
  platform: 'shopify';
  connectionStatus: ConnectedStoreConnectionStatus;
  shopifyStatus: DataTrustShopifyStatus;
  stripeStatus: DataTrustStripeStatus;
  coverageStatus: DataTrustCoverageStatus;
  lastSuccessfulShopifySyncAt: string | null;
  lastSuccessfulStripeSyncAt: string | null;
  latestShopifySyncState: ConnectedStoreLatestSyncState;
  latestStripeSyncState: ConnectedStoreLatestSyncState;
  limitations: string[];
  recommendedNextStep: string;
  actionsAvailable: ConnectedStoreAvailableAction[];
  updatedAt: string;
};

@Injectable()
export class AiConnectedStoresService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiDataTrustService: AiDataTrustService,
    private readonly shopifySyncService: ShopifySyncService,
    private readonly stripeSyncService: StripeSyncService,
  ) {}

  async listConnectedStores(principal: CurrentPrincipal, query: QueryAiOrganizationDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const stores = await this.buildConnectedStores(organizationId);

    return buildSuccessResponse('Connected stores retrieved successfully.', stores);
  }

  async getConnectedStoreById(
    principal: CurrentPrincipal,
    storeId: string,
    query: QueryAiOrganizationDto,
  ) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const stores = await this.buildConnectedStores(organizationId);
    const store = stores.find((item) => item.storeId === storeId);

    if (!store) {
      throw new NotFoundException('Connected store could not be found.');
    }

    return buildSuccessResponse('Connected store retrieved successfully.', store);
  }

  async refreshConnectedStore(
    principal: CurrentPrincipal,
    storeId: string,
    dto: ManageConnectedStoreDto,
  ) {
    return this.getConnectedStoreById(principal, storeId, dto);
  }

  async retryShopifySync(
    principal: CurrentPrincipal,
    storeId: string,
    dto: ManageConnectedStoreDto,
  ) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );

    await this.assertStoreBelongsToOrganization(storeId, organizationId);
    await this.shopifySyncService.syncAllForOrganization(principal, { organizationId });

    return this.getConnectedStoreById(principal, storeId, { organizationId });
  }

  async retryStripeSync(
    principal: CurrentPrincipal,
    storeId: string,
    dto: ManageConnectedStoreDto,
  ) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );

    await this.assertStoreBelongsToOrganization(storeId, organizationId);
    await this.stripeSyncService.syncForOrganization(principal, { organizationId });

    return this.getConnectedStoreById(principal, storeId, { organizationId });
  }

  private async buildConnectedStores(organizationId: string): Promise<ConnectedStoreStatus[]> {
    const trust = await this.aiDataTrustService.getTrustForOrganization(organizationId);
    const stores = await this.prismaService.integrationShopifyStore.findMany({
      where: { organizationId },
      orderBy: [{ isActive: 'desc' }, { installedAt: 'desc' }],
      select: {
        id: true,
        shopDomain: true,
        isActive: true,
      },
    });

    if (stores.length === 0) {
      return [this.buildPlaceholderStore(trust)];
    }

    const [latestStripeSyncRun, latestSuccessfulStripeSyncRun] = await Promise.all([
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

    return Promise.all(
      stores.map(async (store) => {
        const [latestShopifySyncRun, latestSuccessfulShopifySyncRun] = await Promise.all([
          this.prismaService.shopifySyncRun.findFirst({
            where: { organizationId, shopifyStoreId: store.id },
            orderBy: { startedAt: 'desc' },
            select: { status: true, startedAt: true, completedAt: true },
          }),
          this.prismaService.shopifySyncRun.findFirst({
            where: {
              organizationId,
              shopifyStoreId: store.id,
              status: { in: ['SUCCEEDED', 'PARTIAL_SUCCESS'] },
            },
            orderBy: { completedAt: 'desc' },
            select: { status: true, startedAt: true, completedAt: true },
          }),
        ]);

        const latestShopifySyncState = this.toLatestSyncState({
          connected: store.isActive,
          latestStatus: latestShopifySyncRun?.status ?? null,
          lastSuccessfulAt:
            latestSuccessfulShopifySyncRun?.completedAt ?? latestSuccessfulShopifySyncRun?.startedAt ?? null,
        });
        const latestStripeSyncState = this.toLatestSyncState({
          connected: trust.integrations.stripe.connected,
          latestStatus: latestStripeSyncRun?.status ?? null,
          lastSuccessfulAt:
            latestSuccessfulStripeSyncRun?.completedAt ?? latestSuccessfulStripeSyncRun?.startedAt ?? null,
        });

        return {
          storeId: store.id,
          storeName: store.shopDomain,
          platform: 'shopify' as const,
          connectionStatus: this.toConnectionStatus({
            storeActive: store.isActive,
            latestShopifySyncState,
            stripeStatus: trust.stripeStatus,
          }),
          shopifyStatus: store.isActive ? trust.shopifyStatus : 'not_connected',
          stripeStatus: trust.stripeStatus,
          coverageStatus: trust.coverageStatus,
          lastSuccessfulShopifySyncAt:
            latestSuccessfulShopifySyncRun?.completedAt?.toISOString() ??
            latestSuccessfulShopifySyncRun?.startedAt?.toISOString() ??
            null,
          lastSuccessfulStripeSyncAt:
            latestSuccessfulStripeSyncRun?.completedAt?.toISOString() ??
            latestSuccessfulStripeSyncRun?.startedAt?.toISOString() ??
            null,
          latestShopifySyncState,
          latestStripeSyncState,
          limitations: this.buildLimitationsForStore(trust, store.isActive),
          recommendedNextStep: this.buildNextStep({
            storeActive: store.isActive,
            latestShopifySyncState,
            stripeStatus: trust.stripeStatus,
            coverageStatus: trust.coverageStatus,
          }),
          actionsAvailable: this.buildActions({
            storeActive: store.isActive,
            latestShopifySyncState,
            stripeStatus: trust.stripeStatus,
            coverageStatus: trust.coverageStatus,
          }),
          updatedAt: trust.updatedAt,
        };
      }),
    );
  }

  private buildPlaceholderStore(trust: CanonicalDataTrustStatus): ConnectedStoreStatus {
    return {
      storeId: 'not-connected',
      storeName: 'No connected store',
      platform: 'shopify',
      connectionStatus: 'not_connected',
      shopifyStatus: 'not_connected',
      stripeStatus: trust.stripeStatus,
      coverageStatus: 'unavailable',
      lastSuccessfulShopifySyncAt: null,
      lastSuccessfulStripeSyncAt: trust.integrations.stripe.lastSuccessfulSyncAt,
      latestShopifySyncState: 'not_connected',
      latestStripeSyncState: this.toLatestSyncState({
        connected: trust.integrations.stripe.connected,
        latestStatus: trust.integrations.stripe.latestSyncStatus,
        lastSuccessfulAt: trust.integrations.stripe.lastSuccessfulSyncAt
          ? new Date(trust.integrations.stripe.lastSuccessfulSyncAt)
          : null,
      }),
      limitations: ['Connect your store to start receiving insights.'],
      recommendedNextStep: 'Connect your store to start receiving insights.',
      actionsAvailable: ['reconnect_store'],
      updatedAt: trust.updatedAt,
    };
  }

  private buildLimitationsForStore(trust: CanonicalDataTrustStatus, storeActive: boolean) {
    if (!storeActive) {
      return ['This store is not currently connected.'];
    }

    return trust.limitations;
  }

  private buildNextStep(input: {
    storeActive: boolean;
    latestShopifySyncState: ConnectedStoreLatestSyncState;
    stripeStatus: DataTrustStripeStatus;
    coverageStatus: DataTrustCoverageStatus;
  }) {
    if (!input.storeActive) {
      return 'Connect your store to start receiving insights.';
    }

    if (input.latestShopifySyncState === 'never_synced' || input.latestShopifySyncState === 'in_progress') {
      return 'Your store is connected. Initial data is still being collected.';
    }

    if (input.latestShopifySyncState === 'failed' || input.latestShopifySyncState === 'delayed') {
      return 'Store data needs attention. Retry sync to restore current insights.';
    }

    if (input.stripeStatus === 'not_connected') {
      return 'Payments are not connected. Payments insights are unavailable until connected.';
    }

    if (input.stripeStatus === 'failed' || input.stripeStatus === 'stale' || input.stripeStatus === 'delayed') {
      return 'Payments data needs attention. Retry sync to restore current visibility.';
    }

    if (input.coverageStatus === 'partial' || input.coverageStatus === 'minimal') {
      return 'Some store data is currently limited.';
    }

    return 'Data is current and integrations look healthy.';
  }

  private buildActions(input: {
    storeActive: boolean;
    latestShopifySyncState: ConnectedStoreLatestSyncState;
    stripeStatus: DataTrustStripeStatus;
    coverageStatus: DataTrustCoverageStatus;
  }): ConnectedStoreAvailableAction[] {
    if (!input.storeActive) {
      return ['reconnect_store'];
    }

    const actions: ConnectedStoreAvailableAction[] = [];

    if (input.latestShopifySyncState === 'never_synced' || input.latestShopifySyncState === 'in_progress') {
      actions.push('wait_for_initial_sync');
    }

    if (input.latestShopifySyncState === 'failed' || input.latestShopifySyncState === 'delayed') {
      actions.push('retry_shopify_sync');
    }

    if (input.stripeStatus === 'not_connected') {
      actions.push('connect_payments');
    }

    if (input.stripeStatus === 'failed' || input.stripeStatus === 'stale' || input.stripeStatus === 'delayed') {
      actions.push('retry_stripe_sync');
    }

    if (input.coverageStatus === 'partial' || input.coverageStatus === 'minimal') {
      actions.push('review_permissions');
    }

    return actions;
  }

  private toConnectionStatus(input: {
    storeActive: boolean;
    latestShopifySyncState: ConnectedStoreLatestSyncState;
    stripeStatus: DataTrustStripeStatus;
  }): ConnectedStoreConnectionStatus {
    if (!input.storeActive) {
      return 'not_connected';
    }

    if (input.latestShopifySyncState === 'never_synced' || input.latestShopifySyncState === 'in_progress') {
      return 'connecting';
    }

    if (
      input.latestShopifySyncState === 'failed' ||
      input.latestShopifySyncState === 'delayed' ||
      input.stripeStatus === 'failed' ||
      input.stripeStatus === 'stale'
    ) {
      return 'attention_required';
    }

    return 'connected';
  }

  private toLatestSyncState(input: {
    connected: boolean;
    latestStatus: string | null;
    lastSuccessfulAt: Date | null;
  }): ConnectedStoreLatestSyncState {
    if (!input.connected) {
      return 'not_connected';
    }

    if (input.latestStatus === 'RUNNING') {
      return 'in_progress';
    }

    if (input.latestStatus === 'FAILED') {
      return 'failed';
    }

    if (!input.lastSuccessfulAt) {
      return 'never_synced';
    }

    const ageHours = (Date.now() - input.lastSuccessfulAt.getTime()) / (1000 * 60 * 60);
    if (ageHours > 6) {
      return 'delayed';
    }

    return 'success';
  }

  private async assertStoreBelongsToOrganization(storeId: string, organizationId: string) {
    const store = await this.prismaService.integrationShopifyStore.findFirst({
      where: { id: storeId, organizationId },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundException('Connected store could not be found.');
    }
  }
}
