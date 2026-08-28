import {
  BadGatewayException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PlatformLoggerService } from '../../../common/services/platform-logger.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopifyCryptoService } from './shopify-crypto.service';
import { ShopifyCustomer, ShopifyCustomersResponse } from './interfaces/shopify-customer.interface';
import { ShopifyOrder, ShopifyOrdersResponse } from './interfaces/shopify-order.interface';
import { ShopifyProduct, ShopifyProductsResponse } from './interfaces/shopify-product.interface';

type ShopifyStoreConnection = {
  id: string;
  organizationId: string;
  shopDomain: string;
  accessToken: string;
};

@Injectable()
export class ShopifyApiService {
  private readonly requestTimeoutMs = 15_000;
  private readonly defaultPageLimit = 50;
  private readonly protectedCustomerDataMarker =
    'not approved to access rest endpoints with protected customer data';

  constructor(
    private readonly prismaService: PrismaService,
    private readonly shopifyCryptoService: ShopifyCryptoService,
    private readonly configService: ConfigService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async getActiveStoreConnectionForOrganization(organizationId: string): Promise<ShopifyStoreConnection> {
    const [activeStore, latestStore] = await Promise.all([
      this.prismaService.integrationShopifyStore.findFirst({
        where: { organizationId, isActive: true },
        orderBy: { installedAt: 'desc' },
        select: {
          id: true,
          organizationId: true,
          shopDomain: true,
          accessTokenCipher: true,
          isActive: true,
        },
      }),
      this.prismaService.integrationShopifyStore.findFirst({
        where: { organizationId },
        orderBy: { installedAt: 'desc' },
        select: {
          id: true,
          organizationId: true,
          shopDomain: true,
          accessTokenCipher: true,
          isActive: true,
        },
      }),
    ]);

    const store = activeStore ?? latestStore;

    if (!store) {
      throw new NotFoundException({
        message: 'No active Shopify store is connected for this organization.',
        code: 'shopify_store_not_connected',
      });
    }

    if (!store.isActive) {
      throw new ConflictException({
        message: 'The connected Shopify store is inactive.',
        code: 'shopify_store_inactive',
      });
    }

    let accessToken: string;
    try {
      accessToken = this.shopifyCryptoService.decrypt(store.accessTokenCipher);
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'The stored Shopify access token could not be decrypted.',
        code: 'invalid_encrypted_token',
        details: error instanceof Error ? error.message : 'Unknown token decryption failure',
      });
    }

    return {
      id: store.id,
      organizationId: store.organizationId,
      shopDomain: store.shopDomain,
      accessToken,
    };
  }

  async getOrdersForOrganization(
    organizationId: string,
    params?: { limit?: number; updatedAtMin?: string },
  ) {
    const store = await this.getActiveStoreConnectionForOrganization(organizationId);
    const orders = await this.getOrders(store.shopDomain, store.accessToken, params);
    return { store, orders };
  }

  async getProductsForOrganization(
    organizationId: string,
    params?: { limit?: number; updatedAtMin?: string },
  ) {
    const store = await this.getActiveStoreConnectionForOrganization(organizationId);
    const products = await this.getProducts(store.shopDomain, store.accessToken, params);
    return { store, products };
  }

  async getCustomersForOrganization(
    organizationId: string,
    params?: { limit?: number; updatedAtMin?: string },
  ) {
    const store = await this.getActiveStoreConnectionForOrganization(organizationId);
    const customers = await this.getCustomers(store.shopDomain, store.accessToken, params);
    return { store, customers };
  }

  async getOrders(
    shopDomain: string,
    accessToken: string,
    params?: { limit?: number; updatedAtMin?: string },
  ): Promise<ShopifyOrder[]> {
    const payload = await this.requestShopifyAdminApi<ShopifyOrdersResponse>({
      shopDomain,
      accessToken,
      endpoint: 'orders.json',
      method: 'GET',
      errorCode: 'failed_to_fetch_shopify_orders',
      searchParams: {
        status: 'any',
        limit: String(params?.limit ?? this.defaultPageLimit),
        ...(params?.updatedAtMin ? { updated_at_min: params.updatedAtMin } : {}),
      },
    });

    return Array.isArray(payload.orders) ? payload.orders : [];
  }

  async getProducts(
    shopDomain: string,
    accessToken: string,
    params?: { limit?: number; updatedAtMin?: string },
  ): Promise<ShopifyProduct[]> {
    const payload = await this.requestShopifyAdminApi<ShopifyProductsResponse>({
      shopDomain,
      accessToken,
      endpoint: 'products.json',
      method: 'GET',
      errorCode: 'failed_to_fetch_shopify_products',
      searchParams: {
        limit: String(params?.limit ?? this.defaultPageLimit),
        ...(params?.updatedAtMin ? { updated_at_min: params.updatedAtMin } : {}),
      },
    });

    return Array.isArray(payload.products) ? payload.products : [];
  }

  async getCustomers(
    shopDomain: string,
    accessToken: string,
    params?: { limit?: number; updatedAtMin?: string },
  ): Promise<ShopifyCustomer[]> {
    const payload = await this.requestShopifyAdminApi<ShopifyCustomersResponse>({
      shopDomain,
      accessToken,
      endpoint: 'customers.json',
      method: 'GET',
      errorCode: 'failed_to_fetch_shopify_customers',
      searchParams: {
        limit: String(params?.limit ?? this.defaultPageLimit),
        ...(params?.updatedAtMin ? { updated_at_min: params.updatedAtMin } : {}),
      },
    });

    return Array.isArray(payload.customers) ? payload.customers : [];
  }

  async listWebhookSubscriptions(shopDomain: string, accessToken: string) {
    const payload = await this.requestShopifyAdminApi<{
      webhooks: Array<{
        id: number | string;
        topic: string;
        address: string;
        format?: string | null;
      }>;
    }>({
      shopDomain,
      accessToken,
      endpoint: 'webhooks.json',
      method: 'GET',
      errorCode: 'webhook_registration_failed',
    });

    return Array.isArray(payload.webhooks) ? payload.webhooks : [];
  }

  async registerWebhookSubscription(
    shopDomain: string,
    accessToken: string,
    input: {
      topic: string;
      address: string;
    },
  ) {
    const payload = await this.requestShopifyAdminApi<{
      webhook?: {
        id: number | string;
        topic: string;
        address: string;
        format?: string | null;
      };
    }>({
      shopDomain,
      accessToken,
      endpoint: 'webhooks.json',
      method: 'POST',
      errorCode: 'webhook_registration_failed',
      body: {
        webhook: {
          topic: input.topic,
          address: input.address,
          format: 'json',
        },
      },
    });

    return payload.webhook ?? null;
  }

  isProtectedCustomerDataRequiredError(error: unknown) {
    if (!(error instanceof BadGatewayException)) {
      return false;
    }

    const response = error.getResponse();
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      return false;
    }

    const code = 'code' in response ? response.code : null;
    return code === 'protected_customer_data_required';
  }

  private async requestShopifyAdminApi<T>(input: {
    shopDomain: string;
    accessToken: string;
    endpoint: string;
    method: 'GET' | 'POST';
    errorCode:
      | 'failed_to_fetch_shopify_orders'
      | 'failed_to_fetch_shopify_products'
      | 'failed_to_fetch_shopify_customers'
      | 'webhook_registration_failed';
    searchParams?: Record<string, string>;
    body?: Record<string, unknown>;
  }): Promise<T> {
    if (!this.environment.shopifyApiVersion) {
      throw new InternalServerErrorException({
        message: 'Shopify API configuration is missing.',
        code: 'missing_shopify_api_configuration',
      });
    }

    const url = new URL(
      `https://${input.shopDomain}/admin/api/${this.environment.shopifyApiVersion}/${input.endpoint}`,
    );

    for (const [key, value] of Object.entries(input.searchParams ?? {})) {
      url.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    this.logger.debug({
      event: 'shopify.fetch.started',
      shopDomain: input.shopDomain,
      endpoint: input.endpoint,
    });

    try {
      const response = await fetch(url, {
        method: input.method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': input.accessToken,
        },
        ...(input.body ? { body: JSON.stringify(input.body) } : {}),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => null)) as T | null;
      const callLimit = response.headers.get('x-shopify-shop-api-call-limit');

      if (!response.ok || payload === null) {
        const protectedCustomerDataRequired = this.isProtectedCustomerDataDenied(payload);

        this.logger.warn({
          event: 'shopify.fetch.failed',
          shopDomain: input.shopDomain,
          endpoint: input.endpoint,
          statusCode: response.status,
          protectedCustomerDataRequired,
          apiCallLimit: callLimit,
        });
        throw new BadGatewayException({
          message: protectedCustomerDataRequired
            ? 'Shopify protected customer and order data approval is required before Nexora can sync these resources.'
            : 'Shopify data fetch failed.',
          code: protectedCustomerDataRequired
            ? 'protected_customer_data_required'
            : input.errorCode,
          details: {
            statusCode: response.status,
            endpoint: input.endpoint,
            raw: payload,
          },
        });
      }

      this.logger.debug({
        event: 'shopify.fetch.completed',
        shopDomain: input.shopDomain,
        endpoint: input.endpoint,
        statusCode: response.status,
        apiCallLimit: callLimit,
      });

      return payload;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new ServiceUnavailableException({
        message: 'The Shopify Admin API request could not be completed.',
        code: input.errorCode,
        details: error instanceof Error ? error.message : 'Unknown Shopify API failure',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private get environment() {
    return this.configService.get('environment') as {
      shopifyApiVersion: string;
    };
  }

  private isProtectedCustomerDataDenied(payload: unknown) {
    const normalized = JSON.stringify(payload ?? {}).toLowerCase();
    return normalized.includes(this.protectedCustomerDataMarker);
  }
}
