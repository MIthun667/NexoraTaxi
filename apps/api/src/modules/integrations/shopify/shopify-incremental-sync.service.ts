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
import { ShopifySyncDto } from './dto/shopify-sync.dto';
import { ShopifyApiService } from './shopify-api.service';
import { ShopifySyncService } from './shopify-sync.service';

type IncrementalCursorType = 'orders' | 'products' | 'customers';

@Injectable()
export class ShopifyIncrementalSyncService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly shopifyApiService: ShopifyApiService,
    private readonly shopifySyncService: ShopifySyncService,
    private readonly auditService: AuditService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async syncOrdersIncremental(principal: CurrentPrincipal, dto: ShopifySyncDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);
    const run = await this.runIncrementalSync(dto.organizationId, 'orders', dto.limit);
    return buildSuccessResponse(
      'Shopify incremental orders sync completed successfully.',
      this.shopifySyncService.toSyncRunView(run),
    );
  }

  async syncProductsIncremental(principal: CurrentPrincipal, dto: ShopifySyncDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);
    const run = await this.runIncrementalSync(dto.organizationId, 'products', dto.limit);
    return buildSuccessResponse(
      'Shopify incremental products sync completed successfully.',
      this.shopifySyncService.toSyncRunView(run),
    );
  }

  async syncCustomersIncremental(principal: CurrentPrincipal, dto: ShopifySyncDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);
    const run = await this.runIncrementalSync(dto.organizationId, 'customers', dto.limit);
    return buildSuccessResponse(
      'Shopify incremental customers sync completed successfully.',
      this.shopifySyncService.toSyncRunView(run),
    );
  }

  private async runIncrementalSync(
    organizationId: string,
    cursorType: IncrementalCursorType,
    limit?: number,
  ) {
    const connection = await this.shopifyApiService.getActiveStoreConnectionForOrganization(
      organizationId,
    );
    const cursor = await this.prismaService.shopifySyncCursor.findUnique({
      where: {
        shopifyStoreId_cursorType: {
          shopifyStoreId: connection.id,
          cursorType,
        },
      },
    });

    const run = await this.prismaService.shopifySyncRun.create({
      data: {
        organizationId,
        shopifyStoreId: connection.id,
        syncType: `${cursorType}_incremental`,
        status: 'RUNNING',
        metadata: {
          mode: 'incremental',
          lastSyncedAt: cursor?.lastSyncedAt?.toISOString() ?? null,
          limit: limit ?? 50,
        } as Prisma.InputJsonValue,
      },
    });

    this.logger.debug({
      event: 'shopify.incremental_sync.started',
      organizationId,
      shopifyStoreId: connection.id,
      cursorType,
      syncRunId: run.id,
      lastSyncedAt: cursor?.lastSyncedAt?.toISOString() ?? null,
    });

    try {
      const updatedAtMin = cursor?.lastSyncedAt?.toISOString();
      let recordsProcessed = 0;

      if (cursorType === 'orders') {
        const orders = await this.shopifyApiService.getOrders(connection.shopDomain, connection.accessToken, {
          limit,
          updatedAtMin,
        });
        recordsProcessed = await this.shopifySyncService.upsertOrders(
          organizationId,
          connection.id,
          orders,
        );
      } else if (cursorType === 'products') {
        const products = await this.shopifyApiService.getProducts(connection.shopDomain, connection.accessToken, {
          limit,
          updatedAtMin,
        });
        recordsProcessed = await this.shopifySyncService.upsertProducts(
          organizationId,
          connection.id,
          products,
        );
      } else {
        const customers = await this.shopifyApiService.getCustomers(connection.shopDomain, connection.accessToken, {
          limit,
          updatedAtMin,
        });
        recordsProcessed = await this.shopifySyncService.upsertCustomers(
          organizationId,
          connection.id,
          customers,
        );
      }

      await this.shopifySyncService.updateSyncCursor(
        organizationId,
        connection.id,
        cursorType,
        new Date(),
        null,
        {
          strategy: 'updated_at_min',
          syncMode: 'incremental',
        },
      );

      const completedRun = await this.prismaService.shopifySyncRun.update({
        where: { id: run.id },
        data: {
          status: 'SUCCEEDED',
          completedAt: new Date(),
          recordsProcessed,
        },
      });

      await this.auditService.record({
        action: `integration.shopify.sync.${cursorType}.incremental`,
        entityType: 'shopify-sync-run',
        entityId: completedRun.id,
        organizationId,
        summary: `Shopify incremental ${cursorType} sync completed successfully.`,
        metadata: {
          shopifyStoreId: connection.id,
          recordsProcessed,
        } as Prisma.InputJsonValue,
      });

      this.logger.debug({
        event: 'shopify.incremental_sync.completed',
        organizationId,
        shopifyStoreId: connection.id,
        cursorType,
        syncRunId: run.id,
        recordsProcessed,
      });

      return completedRun;
    } catch (error) {
      await this.prismaService.shopifySyncRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown incremental sync failure',
        },
      });

      this.logger.warn({
        event: 'shopify.incremental_sync.failed',
        organizationId,
        shopifyStoreId: connection.id,
        cursorType,
        syncRunId: run.id,
        reason: error instanceof Error ? error.message : 'Unknown incremental sync failure',
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Shopify incremental sync failed.',
        code: 'incremental_sync_failed',
        details: error instanceof Error ? error.message : 'Unknown incremental sync failure',
      });
    }
  }

  private async assertOrganizationAccess(principal: CurrentPrincipal, organizationId: string) {
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
}
