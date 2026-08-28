import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import { PlatformLoggerService } from '../../../common/services/platform-logger.service';
import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildSuccessResponse } from '../../../shared/responses/response.util';
import { AuditService } from '../../audit/audit.service';
import { RegisterShopifyWebhooksDto } from './dto/register-shopify-webhooks.dto';
import { ShopifyApiService } from './shopify-api.service';

const SUPPORTED_SHOPIFY_WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
  'products/create',
  'products/update',
  'customers/create',
  'customers/update',
  'app/uninstalled',
] as const;

@Injectable()
export class ShopifyWebhookRegistrationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly shopifyApiService: ShopifyApiService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async registerWebhooksForOrganization(principal: CurrentPrincipal, dto: RegisterShopifyWebhooksDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);
    const summary = await this.registerWebhooksForStoreByOrganization(dto.organizationId);

    return buildSuccessResponse('Shopify webhooks registered successfully.', summary);
  }

  async registerWebhooksForStoreByOrganization(organizationId: string) {
    const connection = await this.shopifyApiService.getActiveStoreConnectionForOrganization(
      organizationId,
    );
    return this.registerWebhooksForResolvedStore({
      organizationId,
      shopifyStoreId: connection.id,
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });
  }

  async registerWebhooksForStore(shopifyStoreId: string) {
    const store = await this.prismaService.integrationShopifyStore.findUnique({
      where: { id: shopifyStoreId },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!store) {
      throw new NotFoundException({
        message: 'Shopify store connection not found.',
        code: 'webhook_store_not_found',
      });
    }

    return this.registerWebhooksForStoreByOrganization(store.organizationId);
  }

  private async registerWebhooksForResolvedStore(input: {
    organizationId: string;
    shopifyStoreId: string;
    shopDomain: string;
    accessToken: string;
  }) {
    const address = this.getWebhookEndpointAddress();

    this.logger.debug({
      event: 'shopify.webhook_registration.started',
      organizationId: input.organizationId,
      shopifyStoreId: input.shopifyStoreId,
      shopDomain: input.shopDomain,
    });

    const existing = await this.shopifyApiService.listWebhookSubscriptions(
      input.shopDomain,
      input.accessToken,
    );

    const existingKeys = new Set(
      existing
        .filter((webhook) => webhook.address === address)
        .map((webhook) => `${webhook.topic}::${webhook.address}`),
    );

    const registeredTopics: string[] = [];
    const skippedTopics: string[] = [];

    for (const topic of SUPPORTED_SHOPIFY_WEBHOOK_TOPICS) {
      const key = `${topic}::${address}`;
      if (existingKeys.has(key)) {
        skippedTopics.push(topic);
        continue;
      }

      await this.shopifyApiService.registerWebhookSubscription(input.shopDomain, input.accessToken, {
        topic,
        address,
      });
      registeredTopics.push(topic);
    }

    await this.auditService.record({
      action: 'integration.shopify.webhooks.registered',
      entityType: 'integration-shopify-store',
      entityId: input.shopifyStoreId,
      organizationId: input.organizationId,
      summary: `Shopify webhooks were registered for ${input.shopDomain}.`,
      metadata: {
        address,
        registeredTopics,
        skippedTopics,
      } as Prisma.InputJsonValue,
    });

    this.logger.debug({
      event: 'shopify.webhook_registration.completed',
      organizationId: input.organizationId,
      shopifyStoreId: input.shopifyStoreId,
      registeredCount: registeredTopics.length,
      skippedCount: skippedTopics.length,
    });

    return {
      shopifyStoreId: input.shopifyStoreId,
      shopDomain: input.shopDomain,
      webhookEndpoint: address,
      registeredTopics,
      skippedTopics,
      supportedTopics: [...SUPPORTED_SHOPIFY_WEBHOOK_TOPICS],
    };
  }

  private async assertOrganizationAccess(principal: CurrentPrincipal, organizationId: string) {
    if (principal.organizationId !== organizationId) {
      throw new ForbiddenException({
        message: 'The current principal cannot manage Shopify webhooks for this organization.',
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

  private getWebhookEndpointAddress() {
    const environment = this.configService.get('environment') as {
      apiPrefix: string;
      shopifyWebhookBaseUrl: string;
    };

    if (!environment.shopifyWebhookBaseUrl) {
      throw new InternalServerErrorException({
        message: 'Shopify webhook configuration is missing.',
        code: 'missing_shopify_webhook_configuration',
      });
    }

    const baseUrl = environment.shopifyWebhookBaseUrl.replace(/\/$/, '');
    const apiPrefix = environment.apiPrefix.replace(/^\/|\/$/g, '');
    return `${baseUrl}/${apiPrefix}/integrations/shopify/webhooks`;
  }
}
