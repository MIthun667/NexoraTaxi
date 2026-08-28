import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { PlatformLoggerService } from '../../../common/services/platform-logger.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildSuccessResponse } from '../../../shared/responses/response.util';
import { AuditService } from '../../audit/audit.service';
import { RegisterShopifyWebhooksDto } from './dto/register-shopify-webhooks.dto';
import { ShopifyCustomer } from './interfaces/shopify-customer.interface';
import { ShopifyOrder } from './interfaces/shopify-order.interface';
import { ShopifyProduct } from './interfaces/shopify-product.interface';
import { ShopifySyncService } from './shopify-sync.service';
import { ShopifyWebhookValidatorService } from './shopify-webhook-validator.service';

const SUPPORTED_TOPICS = new Set([
  'orders/create',
  'orders/updated',
  'products/create',
  'products/update',
  'customers/create',
  'customers/update',
  'app/uninstalled',
]);

@Injectable()
export class ShopifyWebhookService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly validatorService: ShopifyWebhookValidatorService,
    private readonly shopifySyncService: ShopifySyncService,
    private readonly auditService: AuditService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async processWebhookDelivery(input: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: Buffer;
  }) {
    const topic = this.readHeader(input.headers['x-shopify-topic']) ?? 'unknown';
    const shopDomain = this.readHeader(input.headers['x-shopify-shop-domain']) ?? 'unknown';
    const webhookId = this.readHeader(input.headers['x-shopify-webhook-id']) ?? null;
    const eventId = this.readHeader(input.headers['x-shopify-event-id']) ?? null;
    const payloadHash = this.validatorService.hashPayload(input.rawBody);
    const rawPayloadValue = this.parseRawPayload(input.rawBody);

    this.logger.debug({
      event: 'shopify.webhook.received',
      topic,
      shopDomain,
      webhookId,
    });

    const store = await this.prismaService.integrationShopifyStore.findFirst({
      where: { shopDomain },
      orderBy: [{ isActive: 'desc' }, { installedAt: 'desc' }],
      select: {
        id: true,
        organizationId: true,
        shopDomain: true,
        isActive: true,
      },
    });

    const delivery = await this.prismaService.shopifyWebhookDelivery.create({
      data: {
        organizationId: store?.organizationId ?? null,
        shopifyStoreId: store?.id ?? null,
        topic,
        shopDomain,
        webhookId,
        eventId,
        payloadHash,
        status: 'RECEIVED',
        rawPayload: rawPayloadValue as Prisma.InputJsonValue,
      },
    });

    try {
      this.validatorService.validateSignature(
        input.rawBody,
        input.headers['x-shopify-hmac-sha256'],
      );

      this.logger.debug({
        event: 'shopify.webhook.validated',
        topic,
        shopDomain,
        webhookId,
        deliveryId: delivery.id,
      });

      if (!SUPPORTED_TOPICS.has(topic)) {
        const ignored = await this.prismaService.shopifyWebhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'IGNORED',
            processedAt: new Date(),
          },
        });

        return buildSuccessResponse('Shopify webhook recorded successfully.', {
          deliveryId: ignored.id,
          topic,
          status: ignored.status,
          processedAt: ignored.processedAt,
        });
      }

      if (!store) {
        throw new NotFoundException({
          message: 'The Shopify webhook store could not be resolved.',
          code: 'webhook_store_not_found',
        });
      }

      await this.handleTopic({
        topic,
        store,
        payload: rawPayloadValue,
        webhookId,
        eventId,
      });

      const succeeded = await this.prismaService.shopifyWebhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'SUCCEEDED',
          processedAt: new Date(),
        },
      });

      this.logger.debug({
        event: 'shopify.webhook.processed',
        topic,
        shopDomain,
        webhookId,
        deliveryId: delivery.id,
        status: succeeded.status,
      });

      return buildSuccessResponse('Shopify webhook processed successfully.', {
        deliveryId: succeeded.id,
        topic,
        status: succeeded.status,
        processedAt: succeeded.processedAt,
      });
    } catch (error) {
      await this.prismaService.shopifyWebhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          processedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown webhook failure',
        },
      });

      this.logger.warn({
        event: 'shopify.webhook.failed',
        topic,
        shopDomain,
        webhookId,
        deliveryId: delivery.id,
        reason: error instanceof Error ? error.message : 'Unknown webhook failure',
      });

      throw error;
    }
  }

  async getWebhookStatus(principal: CurrentPrincipal, dto: RegisterShopifyWebhooksDto) {
    await this.shopifySyncService.assertOrganizationAccess(principal, dto.organizationId);

    const deliveries = await this.prismaService.shopifyWebhookDelivery.findMany({
      where: { organizationId: dto.organizationId },
      orderBy: [{ receivedAt: 'desc' }],
      take: Math.min(dto.limit ?? 20, 100),
    });

    return buildSuccessResponse(
      'Shopify webhook deliveries retrieved successfully.',
      deliveries.map((delivery) => ({
        deliveryId: delivery.id,
        topic: delivery.topic,
        shopDomain: delivery.shopDomain,
        status: delivery.status,
        receivedAt: delivery.receivedAt,
        processedAt: delivery.processedAt,
        errorMessage: delivery.errorMessage,
        webhookId: delivery.webhookId,
        eventId: delivery.eventId,
      })),
    );
  }

  private async handleTopic(input: {
    topic: string;
    store: {
      id: string;
      organizationId: string;
      shopDomain: string;
      isActive: boolean;
    };
    payload: Prisma.JsonValue;
    webhookId: string | null;
    eventId: string | null;
  }) {
    if (input.topic === 'orders/create' || input.topic === 'orders/updated') {
      await this.shopifySyncService.upsertOrders(
        input.store.organizationId,
        input.store.id,
        [input.payload as unknown as ShopifyOrder],
      );
      await this.shopifySyncService.updateSyncCursor(
        input.store.organizationId,
        input.store.id,
        'orders',
        new Date(),
        null,
        {
          source: 'webhook',
          topic: input.topic,
        },
      );
      return;
    }

    if (input.topic === 'products/create' || input.topic === 'products/update') {
      await this.shopifySyncService.upsertProducts(
        input.store.organizationId,
        input.store.id,
        [input.payload as unknown as ShopifyProduct],
      );
      await this.shopifySyncService.updateSyncCursor(
        input.store.organizationId,
        input.store.id,
        'products',
        new Date(),
        null,
        {
          source: 'webhook',
          topic: input.topic,
        },
      );
      return;
    }

    if (input.topic === 'customers/create' || input.topic === 'customers/update') {
      await this.shopifySyncService.upsertCustomers(
        input.store.organizationId,
        input.store.id,
        [input.payload as unknown as ShopifyCustomer],
      );
      await this.shopifySyncService.updateSyncCursor(
        input.store.organizationId,
        input.store.id,
        'customers',
        new Date(),
        null,
        {
          source: 'webhook',
          topic: input.topic,
        },
      );
      return;
    }

    if (input.topic === 'app/uninstalled') {
      const updated = await this.prismaService.integrationShopifyStore.update({
        where: { id: input.store.id },
        data: {
          isActive: false,
          uninstalledAt: new Date(),
        },
      });

      this.logger.debug({
        event: 'shopify.webhook.uninstalled',
        organizationId: input.store.organizationId,
        shopifyStoreId: input.store.id,
        shopDomain: input.store.shopDomain,
      });

      await this.auditService.record({
        action: 'integration.shopify.uninstalled',
        entityType: 'integration-shopify-store',
        entityId: updated.id,
        organizationId: input.store.organizationId,
        summary: `Shopify store ${input.store.shopDomain} was deactivated from uninstall webhook.`,
        metadata: {
          topic: input.topic,
          webhookId: input.webhookId,
          eventId: input.eventId,
        } as Prisma.InputJsonValue,
      });
      return;
    }

    throw new ServiceUnavailableException({
      message: 'The Shopify webhook topic is not supported.',
      code: 'webhook_processing_failed',
    });
  }

  private parseRawPayload(rawBody: Buffer): Prisma.JsonValue {
    const rawText = rawBody.toString('utf8');
    if (!rawText) {
      return null;
    }

    try {
      return JSON.parse(rawText) as Prisma.JsonValue;
    } catch {
      return rawText;
    }
  }

  private readHeader(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
