import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

import { PlatformLoggerService } from '../../../common/services/platform-logger.service';
import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildSuccessResponse } from '../../../shared/responses/response.util';
import { AuditService } from '../../audit/audit.service';
import { ConnectShopifyDto } from './dto/connect-shopify.dto';
import { ShopifyCallbackDto } from './dto/shopify-callback.dto';
import { ShopifyStoreView } from './interfaces/shopify-store.interface';
import { ShopifyAuthService } from './shopify-auth.service';
import { ShopifyCryptoService } from './shopify-crypto.service';
import { ShopifyApiService } from './shopify-api.service';
import { ShopifySyncDto } from './dto/shopify-sync.dto';
import { ShopifySyncService } from './shopify-sync.service';
import { ShopifyWebhookRegistrationService } from './shopify-webhook-registration.service';

@Injectable()
export class ShopifyService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly shopifyAuthService: ShopifyAuthService,
    private readonly shopifyCryptoService: ShopifyCryptoService,
    private readonly shopifyApiService: ShopifyApiService,
    private readonly shopifySyncService: ShopifySyncService,
    private readonly shopifyWebhookRegistrationService: ShopifyWebhookRegistrationService,
    private readonly configService: ConfigService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async fetchProducts(principal: CurrentPrincipal, dto: ShopifySyncDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);
    const { store, products } = await this.shopifyApiService.getProductsForOrganization(dto.organizationId, {
      limit: dto.limit,
    });

    return buildSuccessResponse('Shopify products fetched successfully.', {
      shopDomain: store.shopDomain,
      success: true,
      count: products.length,
      products,
    });
  }

  async fetchOrders(principal: CurrentPrincipal, dto: ShopifySyncDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);

    try {
      const { store, orders } = await this.shopifyApiService.getOrdersForOrganization(dto.organizationId, {
        limit: dto.limit,
      });

      return buildSuccessResponse('Shopify orders fetched successfully.', {
        shopDomain: store.shopDomain,
        success: true,
        count: orders.length,
        orders,
      });
    } catch (error) {
      return this.buildSafeProtectedDataResponse(error, 'orders');
    }
  }

  async fetchCustomers(principal: CurrentPrincipal, dto: ShopifySyncDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);

    try {
      const { store, customers } = await this.shopifyApiService.getCustomersForOrganization(dto.organizationId, {
        limit: dto.limit,
      });

      return buildSuccessResponse('Shopify customers fetched successfully.', {
        shopDomain: store.shopDomain,
        success: true,
        count: customers.length,
        customers,
      });
    } catch (error) {
      return this.buildSafeProtectedDataResponse(error, 'customers');
    }
  }

  async syncAll(principal: CurrentPrincipal, dto: ShopifySyncDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);

    try {
      const response = await this.shopifySyncService.syncAllForOrganization(principal, dto);
      const syncRun =
        response.data as {
          status: string;
          recordsProcessed: number;
          metadata?: Record<string, unknown> | null;
        };
      const metadata = syncRun.metadata ?? {};

      return buildSuccessResponse('Shopify sync completed.', {
        status: this.mapSyncStatus(syncRun.status),
        message:
          syncRun.status === 'PARTIAL_SUCCESS'
            ? 'Orders and customers require Shopify approval. Running in limited mode.'
            : 'Shopify data synced successfully.',
        details: {
          products: Number(metadata.productsProcessed ?? 0),
          orders: Number(metadata.ordersProcessed ?? 0),
          customers: Number(metadata.customersProcessed ?? 0),
        },
      });
    } catch (error) {
      if (
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException ||
        error instanceof NotFoundException
      ) {
        this.logger.warn({
          event: 'shopify.sync.safe_failed',
          reason: error.message,
          code:
            typeof error.getResponse() === 'object' && error.getResponse() !== null
              ? (error.getResponse() as { code?: string }).code
              : undefined,
        });

        return buildSuccessResponse('Shopify sync completed.', {
          status: 'failed',
          message: 'Products could not be synced. Verify the Shopify connection and try again.',
          details: {
            products: 0,
            orders: 0,
            customers: 0,
          },
        });
      }

      throw error;
    }
  }

  async connectOrganizationStore(principal: CurrentPrincipal, dto: ConnectShopifyDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);
    const normalizedShopDomain = this.shopifyAuthService.normalizeShopDomain(dto.shopDomain);

    await this.ensureOrganizationCanLinkShop(dto.organizationId, normalizedShopDomain, {
      allowExistingSameOrganizationShop: false,
    });

    const install = this.shopifyAuthService.generateInstallUrl({
      organizationId: dto.organizationId,
      userId: principal.userId,
      shopDomain: normalizedShopDomain,
    });

    await this.auditService.record({
      action: 'integration.shopify.connect.requested',
      entityType: 'integration-shopify-store',
      organizationId: dto.organizationId,
      actorUserId: principal.userId,
      summary: `Shopify installation was requested for ${normalizedShopDomain}.`,
      metadata: {
        shopDomain: normalizedShopDomain,
        stateExpiresAt: install.stateExpiresAt.toISOString(),
      } as Prisma.InputJsonValue,
    });

    return buildSuccessResponse('Shopify install URL generated successfully.', {
      organizationId: dto.organizationId,
      shopDomain: normalizedShopDomain,
      installUrl: install.installUrl,
      stateExpiresAt: install.stateExpiresAt.toISOString(),
    });
  }

  async handleOAuthCallback(
    dto: ShopifyCallbackDto,
    rawQuery: Record<string, string | string[] | undefined>,
  ) {
    this.shopifyAuthService.validateCallbackHmac(rawQuery);
    const normalizedShopDomain = this.shopifyAuthService.normalizeShopDomain(dto.shop);
    const state = this.shopifyAuthService.parseAndValidateState(dto.state, normalizedShopDomain);

    await this.ensureInstallActorStillValid(state.organizationId, state.userId);
    await this.ensureOrganizationCanLinkShop(state.organizationId, normalizedShopDomain, {
      allowExistingSameOrganizationShop: true,
    });

    const tokenResponse = await this.shopifyAuthService.exchangeCodeForAccessToken(
      normalizedShopDomain,
      dto.code,
    );

    const store = await this.prismaService.integrationShopifyStore.upsert({
      where: {
        organizationId_shopDomain: {
          organizationId: state.organizationId,
          shopDomain: normalizedShopDomain,
        },
      },
      update: {
        accessTokenCipher: this.shopifyCryptoService.encrypt(tokenResponse.access_token),
        scope: tokenResponse.scope ?? null,
        metadata: {
          host: dto.host ?? null,
          installedByUserId: state.userId,
          authProvider: 'shopify-oauth',
          apiVersion: this.environment.shopifyApiVersion,
        } as Prisma.InputJsonValue,
        installedAt: new Date(),
        uninstalledAt: null,
        isActive: true,
      },
      create: {
        organizationId: state.organizationId,
        shopDomain: normalizedShopDomain,
        accessTokenCipher: this.shopifyCryptoService.encrypt(tokenResponse.access_token),
        scope: tokenResponse.scope ?? null,
        metadata: {
          host: dto.host ?? null,
          installedByUserId: state.userId,
          authProvider: 'shopify-oauth',
          apiVersion: this.environment.shopifyApiVersion,
        } as Prisma.InputJsonValue,
        installedAt: new Date(),
        isActive: true,
      },
    });

    await this.auditService.record({
      action: 'integration.shopify.connected',
      entityType: 'integration-shopify-store',
      entityId: store.id,
      organizationId: state.organizationId,
      actorUserId: state.userId,
      summary: `Shopify store ${normalizedShopDomain} was connected.`,
      metadata: {
        shopDomain: normalizedShopDomain,
        scope: tokenResponse.scope ?? null,
      } as Prisma.InputJsonValue,
    });

    let webhookRegistration:
      | {
          status: 'SUCCEEDED' | 'FAILED';
          registeredTopics?: string[];
          skippedTopics?: string[];
          errorMessage?: string;
        }
      | undefined;

    try {
      const registrationSummary =
        await this.shopifyWebhookRegistrationService.registerWebhooksForStore(store.id);
      webhookRegistration = {
        status: 'SUCCEEDED',
        registeredTopics: registrationSummary.registeredTopics,
        skippedTopics: registrationSummary.skippedTopics,
      };
    } catch (error) {
      webhookRegistration = {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown webhook registration failure',
      };
      this.logger.warn({
        event: 'shopify.webhook_registration.auto_failed',
        organizationId: state.organizationId,
        shopifyStoreId: store.id,
        shopDomain: normalizedShopDomain,
        reason: webhookRegistration.errorMessage,
      });
    }

    return buildSuccessResponse('Shopify store connected successfully.', {
      store: this.toStoreView(store),
      webhookRegistration,
      redirectUrl: `${this.environment.shopifyAppUrl.replace(/\/$/, '')}/shopify/onboarding?organizationId=${state.organizationId}&integration=shopify&status=connected&shopDomain=${encodeURIComponent(normalizedShopDomain)}`,
    });
  }

  async getStoreByOrganization(principal: CurrentPrincipal, organizationId: string) {
    await this.assertOrganizationAccess(principal, organizationId);

    const store = await this.prismaService.integrationShopifyStore.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { installedAt: 'desc' },
    });

    if (!store) {
      throw new NotFoundException({
        message: 'No Shopify store is connected for this organization.',
        code: 'shopify_store_not_found',
      });
    }

    return buildSuccessResponse('Shopify store retrieved successfully.', this.toStoreView(store));
  }

  async getConnectionStatus(principal: CurrentPrincipal, organizationId: string) {
    await this.assertOrganizationAccess(principal, organizationId);

    const [store, latestSyncRun] = await Promise.all([
      this.prismaService.integrationShopifyStore.findFirst({
        where: { organizationId },
        orderBy: [{ isActive: 'desc' }, { installedAt: 'desc' }],
      }),
      this.prismaService.shopifySyncRun.findFirst({
        where: { organizationId },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    const syncMetadata = this.asRecord(latestSyncRun?.metadata);
    const protectedCustomerDataRequired = Boolean(syncMetadata?.protectedCustomerDataRequired);
    const syncCoverage =
      latestSyncRun?.status === 'SUCCEEDED'
        ? 'FULL'
        : latestSyncRun?.status === 'PARTIAL_SUCCESS'
          ? 'PARTIAL'
          : 'NONE';

    return buildSuccessResponse('Shopify connection status retrieved successfully.', {
      connected: Boolean(store?.isActive),
      fullySynced: latestSyncRun?.status === 'SUCCEEDED',
      partiallySynced: latestSyncRun?.status === 'PARTIAL_SUCCESS',
      limitedAccess: protectedCustomerDataRequired || latestSyncRun?.status === 'PARTIAL_SUCCESS',
      protectedCustomerDataRequired,
      syncCoverage,
      capabilities: {
        productsAvailable: Boolean(store?.isActive),
        ordersAvailable: !protectedCustomerDataRequired,
        customersAvailable: !protectedCustomerDataRequired,
      },
      store: store ? this.toStoreView(store) : null,
      latestSyncRun: latestSyncRun
        ? {
            syncRunId: latestSyncRun.id,
            syncType: latestSyncRun.syncType,
            status: latestSyncRun.status,
            recordsProcessed: latestSyncRun.recordsProcessed,
            startedAt: latestSyncRun.startedAt,
            completedAt: latestSyncRun.completedAt,
            errorMessage: latestSyncRun.errorMessage,
            metadata: latestSyncRun.metadata,
          }
        : null,
    });
  }

  async listStoresForOrganization(principal: CurrentPrincipal, organizationId: string) {
    await this.assertOrganizationAccess(principal, organizationId);

    const stores = await this.prismaService.integrationShopifyStore.findMany({
      where: { organizationId },
      orderBy: [{ isActive: 'desc' }, { installedAt: 'desc' }],
    });

    return buildSuccessResponse(
      'Shopify stores retrieved successfully.',
      stores.map((store) => this.toStoreView(store)),
    );
  }

  async deactivateStore(principal: CurrentPrincipal, organizationId: string, storeId: string) {
    await this.assertOrganizationAccess(principal, organizationId);

    const store = await this.prismaService.integrationShopifyStore.findFirst({
      where: { id: storeId, organizationId },
    });

    if (!store) {
      throw new NotFoundException({
        message: 'Shopify store connection not found.',
        code: 'shopify_store_not_found',
      });
    }

    const updated = await this.prismaService.integrationShopifyStore.update({
      where: { id: store.id },
      data: {
        isActive: false,
        uninstalledAt: new Date(),
      },
    });

    await this.auditService.record({
      action: 'integration.shopify.deactivated',
      entityType: 'integration-shopify-store',
      entityId: updated.id,
      organizationId,
      actorUserId: principal.userId,
      summary: `Shopify store ${updated.shopDomain} was deactivated.`,
    });

    return buildSuccessResponse('Shopify store deactivated successfully.', this.toStoreView(updated));
  }

  private async assertOrganizationAccess(principal: CurrentPrincipal, organizationId: string) {
    if (principal.organizationId !== organizationId) {
      throw new ForbiddenException({
        message: 'The current principal cannot manage integrations for this organization.',
        code: 'organization_access_denied',
      });
    }

    const organization = await this.prismaService.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException({
        message: 'Organization not found.',
        code: 'organization_not_found',
      });
    }
  }

  private async ensureInstallActorStillValid(organizationId: string, userId: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        id: userId,
        organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!user) {
      throw new ForbiddenException({
        message: 'The install actor can no longer link a Shopify store for this organization.',
        code: 'organization_access_denied',
      });
    }
  }

  private async ensureOrganizationCanLinkShop(
    organizationId: string,
    shopDomain: string,
    options: {
      allowExistingSameOrganizationShop: boolean;
    },
  ) {
    const [organizationActiveStore, existingShopLink] = await Promise.all([
      this.prismaService.integrationShopifyStore.findFirst({
        where: {
          organizationId,
          isActive: true,
        },
        select: {
          id: true,
          shopDomain: true,
        },
      }),
      this.prismaService.integrationShopifyStore.findFirst({
        where: {
          shopDomain,
          isActive: true,
          organizationId: { not: organizationId },
        },
        select: {
          id: true,
          organizationId: true,
        },
      }),
    ]);

    if (organizationActiveStore && organizationActiveStore.shopDomain !== shopDomain) {
      throw new ConflictException({
        message: 'This organization already has an active Shopify store connection.',
        code: 'store_already_connected',
        details: {
          existingShopDomain: organizationActiveStore.shopDomain,
        },
      });
    }

    if (
      organizationActiveStore &&
      organizationActiveStore.shopDomain === shopDomain &&
      !options.allowExistingSameOrganizationShop
    ) {
      throw new ConflictException({
        message: 'This Shopify store is already connected for the organization.',
        code: 'store_already_connected',
      });
    }

    if (existingShopLink) {
      throw new ConflictException({
        message: 'This Shopify store is already connected to another organization.',
        code: 'duplicate_shop_connection',
      });
    }
  }

  private toStoreView(store: {
    id: string;
    organizationId: string;
    shopDomain: string;
    scope: string | null;
    installedAt: Date;
    uninstalledAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ShopifyStoreView {
    return {
      id: store.id,
      organizationId: store.organizationId,
      shopDomain: store.shopDomain,
      scope: store.scope,
      installedAt: store.installedAt,
      uninstalledAt: store.uninstalledAt,
      isActive: store.isActive,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }

  private get environment() {
    return this.configService.get('environment') as {
      shopifyApiVersion: string;
      shopifyAppUrl: string;
    };
  }

  private asRecord(value: Prisma.JsonValue | null | undefined) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private buildSafeProtectedDataResponse(error: unknown, resource: 'orders' | 'customers') {
    if (this.shopifyApiService.isProtectedCustomerDataRequiredError(error)) {
      this.logger.warn({
        event: `shopify.${resource}.protected_data_blocked`,
        reason: 'PROTECTED_DATA_BLOCKED',
      });

      return buildSuccessResponse(`Shopify ${resource} access is limited.`, {
        success: false,
        reason: 'PROTECTED_DATA_BLOCKED',
      });
    }

    throw error;
  }

  private mapSyncStatus(status: string) {
    if (status === 'PARTIAL_SUCCESS') {
      return 'partial';
    }

    if (status === 'SUCCEEDED') {
      return 'success';
    }

    return 'failed';
  }
}
