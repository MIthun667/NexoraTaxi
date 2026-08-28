import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PlatformLoggerService } from '../../../common/services/platform-logger.service';
import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildSuccessResponse } from '../../../shared/responses/response.util';
import { AuditService } from '../../audit/audit.service';
import { AiNotificationService } from '../../intelligence/ai-notification.service';
import { ShopifySyncDto } from './dto/shopify-sync.dto';
import { ShopifyCustomer } from './interfaces/shopify-customer.interface';
import { ShopifyOrder } from './interfaces/shopify-order.interface';
import { ShopifyProduct } from './interfaces/shopify-product.interface';
import { ShopifyApiService } from './shopify-api.service';

type ShopifySyncType = 'orders' | 'products' | 'customers' | 'all';
type ShopifySyncStatus = 'SUCCEEDED' | 'PARTIAL_SUCCESS' | 'FAILED';
type ShopifySyncResource = 'orders' | 'products' | 'customers';

type ShopifySyncRunRecord = {
  id: string;
  organizationId: string;
  shopifyStoreId: string;
  syncType: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  recordsProcessed: number;
  errorMessage: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

type ShopifySyncExecutionResult = {
  status: ShopifySyncStatus;
  recordsProcessed: number;
  errorMessage: string | null;
  metadata?: Record<string, unknown>;
};

type ResourceSyncOutcome =
  | {
      resource: ShopifySyncResource;
      status: 'SYNCED';
      recordsProcessed: number;
      recordsFetched: number;
      shopifyStoreId: string;
    }
  | {
      resource: ShopifySyncResource;
      status: 'BLOCKED';
      capability: 'protected_customer_data_required';
      shopifyStoreId: string;
      message: string;
      details: Record<string, unknown> | null;
    };

@Injectable()
export class ShopifySyncService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly shopifyApiService: ShopifyApiService,
    private readonly auditService: AuditService,
    private readonly aiNotificationService: AiNotificationService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async syncOrdersForOrganization(principal: CurrentPrincipal, dto: ShopifySyncDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);
    const run = await this.runSync(dto.organizationId, 'orders', dto.limit);
    return buildSuccessResponse('Shopify orders synced successfully.', this.toSyncRunView(run));
  }

  async syncProductsForOrganization(principal: CurrentPrincipal, dto: ShopifySyncDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);
    const run = await this.runSync(dto.organizationId, 'products', dto.limit);
    return buildSuccessResponse('Shopify products synced successfully.', this.toSyncRunView(run));
  }

  async syncCustomersForOrganization(principal: CurrentPrincipal, dto: ShopifySyncDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);
    const run = await this.runSync(dto.organizationId, 'customers', dto.limit);
    return buildSuccessResponse('Shopify customers synced successfully.', this.toSyncRunView(run));
  }

  async syncAllForOrganization(principal: CurrentPrincipal, dto: ShopifySyncDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);
    const run = await this.runSync(dto.organizationId, 'all', dto.limit);
    return buildSuccessResponse(this.getSyncSuccessMessage(run.status), this.toSyncRunView(run));
  }

  async syncAllSystem(organizationId: string, limit?: number) {
    return this.runSync(organizationId, 'all', limit);
  }

  async getSyncStatus(principal: CurrentPrincipal, dto: ShopifySyncDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);

    const syncRuns = await this.prismaService.shopifySyncRun.findMany({
      where: { organizationId: dto.organizationId },
      orderBy: [{ startedAt: 'desc' }],
      take: Math.min(dto.limit ?? 10, 50),
    });

    return buildSuccessResponse(
      'Shopify sync status retrieved successfully.',
      syncRuns.map((run) => this.toSyncRunView(run)),
    );
  }

  private async runSync(organizationId: string, syncType: ShopifySyncType, limit?: number) {
    const connection = await this.shopifyApiService.getActiveStoreConnectionForOrganization(organizationId);
    const run = await this.prismaService.shopifySyncRun.create({
      data: {
        organizationId,
        shopifyStoreId: connection.id,
        syncType,
        status: 'RUNNING',
        metadata: {
          limit: limit ?? 50,
          shopDomain: connection.shopDomain,
        } as Prisma.InputJsonValue,
      },
    });

    this.logger.debug({
      event: 'shopify.sync.started',
      organizationId,
      shopifyStoreId: connection.id,
      syncType,
      syncRunId: run.id,
    });

    try {
      const executionResult = await this.executeSync(run.id, organizationId, syncType, limit);
      const completedRun = await this.prismaService.shopifySyncRun.update({
        where: { id: run.id },
        data: {
          status: executionResult.status,
          completedAt: new Date(),
          recordsProcessed: executionResult.recordsProcessed,
          errorMessage: executionResult.errorMessage,
          metadata: {
            ...(this.asRecord(run.metadata) ?? {}),
            ...(executionResult.metadata ?? {}),
          } as Prisma.InputJsonValue,
        },
      });

      await this.auditService.record({
        action: `integration.shopify.sync.${syncType}`,
        entityType: 'shopify-sync-run',
        entityId: completedRun.id,
        organizationId,
        summary:
          executionResult.status === 'PARTIAL_SUCCESS'
            ? `Shopify ${syncType} sync completed with limited protected-data access.`
            : `Shopify ${syncType} sync completed successfully.`,
        metadata: {
          shopifyStoreId: connection.id,
          recordsProcessed: executionResult.recordsProcessed,
          status: executionResult.status,
          ...(executionResult.metadata ?? {}),
        } as Prisma.InputJsonValue,
      });

      this.logger.debug({
        event: 'shopify.sync.completed',
        organizationId,
        shopifyStoreId: connection.id,
        syncType,
        syncRunId: run.id,
        recordsProcessed: executionResult.recordsProcessed,
        status: executionResult.status,
      });

      const successfulRunsCount = await this.prismaService.shopifySyncRun.count({
        where: {
          organizationId,
          status: { in: ['SUCCEEDED', 'PARTIAL_SUCCESS'] },
        },
      });

      await this.aiNotificationService.notifySyncCompleted({
        organizationId,
        syncRunId: completedRun.id,
        syncType,
        recordsProcessed: executionResult.recordsProcessed,
        firstSuccessfulSync: successfulRunsCount === 1,
      });

      return completedRun;
    } catch (error) {
      const failedRun = await this.prismaService.shopifySyncRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown Shopify sync failure',
        },
      });

      this.logger.warn({
        event: 'shopify.sync.failed',
        organizationId,
        shopifyStoreId: connection.id,
        syncType,
        syncRunId: run.id,
        reason: error instanceof Error ? error.message : 'Unknown Shopify sync failure',
      });

      await this.auditService.record({
        action: `integration.shopify.sync.${syncType}.failed`,
        entityType: 'shopify-sync-run',
        entityId: failedRun.id,
        organizationId,
        summary: `Shopify ${syncType} sync failed.`,
        metadata: {
          shopifyStoreId: connection.id,
          reason: error instanceof Error ? error.message : 'Unknown Shopify sync failure',
        } as Prisma.InputJsonValue,
      });

      await this.aiNotificationService.notifySyncFailed({
        organizationId,
        syncRunId: failedRun.id,
        syncType,
        errorMessage: failedRun.errorMessage,
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Shopify sync failed.',
        code: 'shopify_sync_failed',
        details: error instanceof Error ? error.message : 'Unknown Shopify sync failure',
      });
    }
  }

  private async executeSync(
    syncRunId: string,
    organizationId: string,
    syncType: ShopifySyncType,
    limit?: number,
  ): Promise<ShopifySyncExecutionResult> {
    if (syncType === 'orders') {
      const { store, orders } = await this.shopifyApiService.getOrdersForOrganization(organizationId, { limit });
      this.logger.debug({
        event: 'shopify.sync.fetch_completed',
        syncRunId,
        syncType,
        shopifyStoreId: store.id,
        recordsFetched: orders.length,
      });
      const processed = await this.upsertOrders(organizationId, store.id, orders);
      await this.updateSyncCursor(organizationId, store.id, 'orders', new Date(), null, {
        strategy: 'full_sync',
      });
      return {
        status: 'SUCCEEDED',
        recordsProcessed: processed,
        errorMessage: null,
        metadata: this.buildResourceMetadata({
          productsSynced: false,
          productsProcessed: 0,
          ordersProcessed: processed,
          customersProcessed: 0,
          ordersBlocked: false,
          customersBlocked: false,
        }),
      };
    }

    if (syncType === 'products') {
      const { store, products } = await this.shopifyApiService.getProductsForOrganization(organizationId, { limit });
      this.logger.debug({
        event: 'shopify.sync.fetch_completed',
        syncRunId,
        syncType,
        shopifyStoreId: store.id,
        recordsFetched: products.length,
      });
      const processed = await this.upsertProducts(organizationId, store.id, products);
      await this.updateSyncCursor(organizationId, store.id, 'products', new Date(), null, {
        strategy: 'full_sync',
      });
      return {
        status: 'SUCCEEDED',
        recordsProcessed: processed,
        errorMessage: null,
        metadata: this.buildResourceMetadata({
          productsSynced: true,
          productsProcessed: processed,
          ordersProcessed: 0,
          customersProcessed: 0,
          ordersBlocked: false,
          customersBlocked: false,
        }),
      };
    }

    if (syncType === 'customers') {
      const { store, customers } = await this.shopifyApiService.getCustomersForOrganization(organizationId, { limit });
      this.logger.debug({
        event: 'shopify.sync.fetch_completed',
        syncRunId,
        syncType,
        shopifyStoreId: store.id,
        recordsFetched: customers.length,
      });
      const processed = await this.upsertCustomers(organizationId, store.id, customers);
      await this.updateSyncCursor(organizationId, store.id, 'customers', new Date(), null, {
        strategy: 'full_sync',
      });
      return {
        status: 'SUCCEEDED',
        recordsProcessed: processed,
        errorMessage: null,
        metadata: this.buildResourceMetadata({
          productsSynced: false,
          productsProcessed: 0,
          ordersProcessed: 0,
          customersProcessed: processed,
          ordersBlocked: false,
          customersBlocked: false,
        }),
      };
    }

    const { store, products } = await this.shopifyApiService.getProductsForOrganization(organizationId, { limit });
    this.logger.debug({
      event: 'shopify.sync.fetch_completed',
      syncRunId,
      syncType: 'products',
      shopifyStoreId: store.id,
      recordsFetched: products.length,
    });
    const productsProcessed = await this.upsertProducts(organizationId, store.id, products);
    await this.updateSyncCursor(organizationId, store.id, 'products', new Date(), null, {
      strategy: 'full_sync',
    });

    const [ordersOutcome, customersOutcome] = await Promise.all([
      this.syncProtectedResource(syncRunId, organizationId, 'orders', store.id, limit),
      this.syncProtectedResource(syncRunId, organizationId, 'customers', store.id, limit),
    ]);

    const blockedOutcomes = [ordersOutcome, customersOutcome].filter(
      (outcome): outcome is Extract<ResourceSyncOutcome, { status: 'BLOCKED' }> =>
        outcome.status === 'BLOCKED',
    );

    const ordersProcessed = ordersOutcome.status === 'SYNCED' ? ordersOutcome.recordsProcessed : 0;
    const customersProcessed = customersOutcome.status === 'SYNCED' ? customersOutcome.recordsProcessed : 0;
    const ordersBlocked = ordersOutcome.status === 'BLOCKED';
    const customersBlocked = customersOutcome.status === 'BLOCKED';
    const protectedCustomerDataRequired = blockedOutcomes.some(
      (outcome) => outcome.capability === 'protected_customer_data_required',
    );

    return {
      status: blockedOutcomes.length > 0 ? 'PARTIAL_SUCCESS' : 'SUCCEEDED',
      recordsProcessed: productsProcessed + ordersProcessed + customersProcessed,
      errorMessage:
        blockedOutcomes.length > 0
          ? 'Products synced successfully. Order and customer sync remain limited until Shopify approves protected customer data access for this app.'
          : null,
      metadata: {
        ...this.buildResourceMetadata({
          productsSynced: true,
          productsProcessed,
          ordersProcessed,
          customersProcessed,
          ordersBlocked,
          customersBlocked,
        }),
        protectedCustomerDataRequired,
        blockedReasons: blockedOutcomes.reduce<Record<string, unknown>>((accumulator, outcome) => {
          accumulator[outcome.resource] = {
            capability: outcome.capability,
            message: outcome.message,
            details: outcome.details,
          };
          return accumulator;
        }, {}),
      },
    };
  }

  async upsertOrders(organizationId: string, shopifyStoreId: string, orders: ShopifyOrder[]) {
    let processed = 0;
    for (const order of orders) {
      const externalOrderId = this.asExternalId(order.id);
      if (!externalOrderId) {
        continue;
      }

      await this.prismaService.shopifyOrder.upsert({
        where: {
          shopifyStoreId_externalOrderId: {
            shopifyStoreId,
            externalOrderId,
          },
        },
        update: {
          orderName: order.name ?? null,
          financialStatus: order.financial_status ?? null,
          fulfillmentStatus: order.fulfillment_status ?? null,
          currencyCode: order.currency ?? null,
          totalPrice: this.toDecimal(order.total_price),
          subtotalPrice: this.toDecimal(order.subtotal_price),
          totalTax: this.toDecimal(order.total_tax),
          customerExternalId: this.asExternalId(order.customer?.id) ?? null,
          placedAt: this.toDate(order.created_at),
          rawPayload: order as unknown as Prisma.InputJsonValue,
        },
        create: {
          organizationId,
          shopifyStoreId,
          externalOrderId,
          orderName: order.name ?? null,
          financialStatus: order.financial_status ?? null,
          fulfillmentStatus: order.fulfillment_status ?? null,
          currencyCode: order.currency ?? null,
          totalPrice: this.toDecimal(order.total_price),
          subtotalPrice: this.toDecimal(order.subtotal_price),
          totalTax: this.toDecimal(order.total_tax),
          customerExternalId: this.asExternalId(order.customer?.id) ?? null,
          placedAt: this.toDate(order.created_at),
          rawPayload: order as unknown as Prisma.InputJsonValue,
        },
      });
      processed += 1;
    }

    this.logger.debug({
      event: 'shopify.sync.records_upserted',
      entityType: 'shopify-order',
      organizationId,
      shopifyStoreId,
      recordsProcessed: processed,
    });

    return processed;
  }

  async upsertProducts(organizationId: string, shopifyStoreId: string, products: ShopifyProduct[]) {
    let processed = 0;
    for (const product of products) {
      const externalProductId = this.asExternalId(product.id);
      if (!externalProductId || !product.title) {
        continue;
      }

      await this.prismaService.shopifyProduct.upsert({
        where: {
          shopifyStoreId_externalProductId: {
            shopifyStoreId,
            externalProductId,
          },
        },
        update: {
          title: product.title,
          handle: product.handle ?? null,
          status: product.status ?? null,
          productType: product.product_type ?? null,
          vendor: product.vendor ?? null,
          tags: product.tags ?? null,
          rawPayload: product as unknown as Prisma.InputJsonValue,
        },
        create: {
          organizationId,
          shopifyStoreId,
          externalProductId,
          title: product.title,
          handle: product.handle ?? null,
          status: product.status ?? null,
          productType: product.product_type ?? null,
          vendor: product.vendor ?? null,
          tags: product.tags ?? null,
          rawPayload: product as unknown as Prisma.InputJsonValue,
        },
      });
      processed += 1;
    }

    this.logger.debug({
      event: 'shopify.sync.records_upserted',
      entityType: 'shopify-product',
      organizationId,
      shopifyStoreId,
      recordsProcessed: processed,
    });

    return processed;
  }

  async upsertCustomers(organizationId: string, shopifyStoreId: string, customers: ShopifyCustomer[]) {
    let processed = 0;
    for (const customer of customers) {
      const externalCustomerId = this.asExternalId(customer.id);
      if (!externalCustomerId) {
        continue;
      }

      await this.prismaService.shopifyCustomer.upsert({
        where: {
          shopifyStoreId_externalCustomerId: {
            shopifyStoreId,
            externalCustomerId,
          },
        },
        update: {
          email: customer.email ?? null,
          firstName: customer.first_name ?? null,
          lastName: customer.last_name ?? null,
          phone: customer.phone ?? null,
          ordersCount: customer.orders_count ?? null,
          totalSpent: this.toDecimal(customer.total_spent),
          state: customer.state ?? null,
          tags: customer.tags ?? null,
          rawPayload: customer as unknown as Prisma.InputJsonValue,
        },
        create: {
          organizationId,
          shopifyStoreId,
          externalCustomerId,
          email: customer.email ?? null,
          firstName: customer.first_name ?? null,
          lastName: customer.last_name ?? null,
          phone: customer.phone ?? null,
          ordersCount: customer.orders_count ?? null,
          totalSpent: this.toDecimal(customer.total_spent),
          state: customer.state ?? null,
          tags: customer.tags ?? null,
          rawPayload: customer as unknown as Prisma.InputJsonValue,
        },
      });
      processed += 1;
    }

    this.logger.debug({
      event: 'shopify.sync.records_upserted',
      entityType: 'shopify-customer',
      organizationId,
      shopifyStoreId,
      recordsProcessed: processed,
    });

    return processed;
  }

  async assertOrganizationAccess(principal: CurrentPrincipal, organizationId: string) {
    if (principal.organizationId !== organizationId) {
      throw new ForbiddenException({
        message: 'The current principal cannot manage Shopify sync for this organization.',
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

  private async syncProtectedResource(
    syncRunId: string,
    organizationId: string,
    resource: Extract<ShopifySyncResource, 'orders' | 'customers'>,
    shopifyStoreId: string,
    limit?: number,
  ): Promise<ResourceSyncOutcome> {
    try {
      if (resource === 'orders') {
        const { orders } = await this.shopifyApiService.getOrdersForOrganization(organizationId, { limit });
        this.logger.debug({
          event: 'shopify.sync.fetch_completed',
          syncRunId,
          syncType: resource,
          shopifyStoreId,
          recordsFetched: orders.length,
        });
        const processed = await this.upsertOrders(organizationId, shopifyStoreId, orders);
        await this.updateSyncCursor(organizationId, shopifyStoreId, 'orders', new Date(), null, {
          strategy: 'full_sync',
        });
        return {
          resource,
          status: 'SYNCED',
          recordsProcessed: processed,
          recordsFetched: orders.length,
          shopifyStoreId,
        };
      }

      const { customers } = await this.shopifyApiService.getCustomersForOrganization(organizationId, { limit });
      this.logger.debug({
        event: 'shopify.sync.fetch_completed',
        syncRunId,
        syncType: resource,
        shopifyStoreId,
        recordsFetched: customers.length,
      });
      const processed = await this.upsertCustomers(organizationId, shopifyStoreId, customers);
      await this.updateSyncCursor(organizationId, shopifyStoreId, 'customers', new Date(), null, {
        strategy: 'full_sync',
      });
      return {
        resource,
        status: 'SYNCED',
        recordsProcessed: processed,
        recordsFetched: customers.length,
        shopifyStoreId,
      };
    } catch (error) {
      if (this.shopifyApiService.isProtectedCustomerDataRequiredError(error)) {
        this.logger.warn({
          event: 'shopify.sync.resource_blocked',
          organizationId,
          shopifyStoreId,
          syncRunId,
          resource,
          capability: 'protected_customer_data_required',
        });
        return {
          resource,
          status: 'BLOCKED',
          capability: 'protected_customer_data_required',
          shopifyStoreId,
          message:
            'Shopify requires protected customer data approval before Nexora can sync this resource.',
          details: this.extractHttpExceptionDetails(error),
        };
      }

      throw error;
    }
  }

  private buildResourceMetadata(input: {
    productsSynced?: boolean;
    productsProcessed: number;
    ordersProcessed: number;
    customersProcessed: number;
    ordersBlocked: boolean;
    customersBlocked: boolean;
  }) {
    const protectedCustomerDataRequired = input.ordersBlocked || input.customersBlocked;

    return {
      productsSynced: input.productsSynced ?? true,
      productsProcessed: input.productsProcessed,
      ordersProcessed: input.ordersProcessed,
      customersProcessed: input.customersProcessed,
      ordersBlocked: input.ordersBlocked,
      customersBlocked: input.customersBlocked,
      protectedCustomerDataRequired,
      syncCoverage: protectedCustomerDataRequired ? 'PARTIAL' : 'FULL',
      capabilityState: protectedCustomerDataRequired ? 'LIMITED_PROTECTED_CUSTOMER_DATA' : 'FULL',
      resources: {
        products: {
          available: true,
          synced: true,
          blocked: false,
          recordsProcessed: input.productsProcessed,
        },
        orders: {
          available: !input.ordersBlocked,
          synced: input.ordersProcessed > 0 || !input.ordersBlocked,
          blocked: input.ordersBlocked,
          recordsProcessed: input.ordersProcessed,
        },
        customers: {
          available: !input.customersBlocked,
          synced: input.customersProcessed > 0 || !input.customersBlocked,
          blocked: input.customersBlocked,
          recordsProcessed: input.customersProcessed,
        },
      },
    };
  }

  private asExternalId(value: string | number | null | undefined) {
    if (value === null || value === undefined) {
      return null;
    }

    return String(value);
  }

  private toDate(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toDecimal(value: string | null | undefined) {
    if (!value?.trim()) {
      return null;
    }

    try {
      return new Prisma.Decimal(value);
    } catch {
      return null;
    }
  }

  async updateSyncCursor(
    organizationId: string,
    shopifyStoreId: string,
    cursorType: 'orders' | 'products' | 'customers',
    lastSyncedAt: Date,
    cursorValue: string | null,
    metadata?: Record<string, unknown>,
  ) {
    return this.prismaService.shopifySyncCursor.upsert({
      where: {
        shopifyStoreId_cursorType: {
          shopifyStoreId,
          cursorType,
        },
      },
      update: {
        organizationId,
        lastSyncedAt,
        cursorValue,
        metadata: (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
      create: {
        organizationId,
        shopifyStoreId,
        cursorType,
        lastSyncedAt,
        cursorValue,
        metadata: (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }

  toSyncRunView(run: ShopifySyncRunRecord) {
    return {
      syncRunId: run.id,
      syncType: run.syncType,
      status: run.status,
      recordsProcessed: run.recordsProcessed,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      errorMessage: run.errorMessage,
      metadata: run.metadata,
    };
  }

  private extractHttpExceptionDetails(error: unknown) {
    if (!(error instanceof HttpException)) {
      return null;
    }

    const response = error.getResponse();
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      return null;
    }

    const details = 'details' in response ? response.details : null;
    if (!details || typeof details !== 'object' || Array.isArray(details)) {
      return null;
    }

    return details as Record<string, unknown>;
  }

  private asRecord(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private getSyncSuccessMessage(status: string) {
    return status === 'PARTIAL_SUCCESS'
      ? 'Shopify products synced. Order and customer data remain limited until Shopify protected customer data approval is granted.'
      : 'Shopify data synced successfully.';
  }
}
