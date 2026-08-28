import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ShopifyTokenResponse } from './interfaces/shopify-token-response.interface';

type ShopifyStatePayload = {
  organizationId: string;
  userId: string;
  shopDomain: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
};

@Injectable()
export class ShopifyAuthService {
  private readonly oauthStateTtlMs = 10 * 60 * 1000;

  constructor(private readonly configService: ConfigService) {}

  normalizeShopDomain(shopDomain: string) {
    const normalized = shopDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');

    if (
      !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(normalized) ||
      normalized.includes('..')
    ) {
      throw new BadRequestException({
        message: 'The provided Shopify shop domain is invalid.',
        code: 'invalid_shop_domain',
      });
    }

    return normalized;
  }

  generateInstallUrl(params: {
    organizationId: string;
    userId: string;
    shopDomain: string;
  }) {
    const shopDomain = this.normalizeShopDomain(params.shopDomain);
    const state = this.generateState({
      organizationId: params.organizationId,
      userId: params.userId,
      shopDomain,
    });
    const url = new URL(`https://${shopDomain}/admin/oauth/authorize`);

    url.searchParams.set('client_id', this.getRequiredConfig('environment.shopifyApiKey'));
    url.searchParams.set(
      'scope',
      this.environment.shopifyScopes.join(','),
    );
    url.searchParams.set(
      'redirect_uri',
      this.getRequiredConfig('environment.shopifyRedirectUri'),
    );
    url.searchParams.set('state', state);

    return {
      shopDomain,
      installUrl: url.toString(),
      state,
      stateExpiresAt: new Date(Date.now() + this.oauthStateTtlMs),
    };
  }

  validateCallbackHmac(queryParams: Record<string, string | string[] | undefined>) {
    const providedHmac = this.readSingleValue(queryParams.hmac);
    if (!providedHmac) {
      throw new BadRequestException({
        message: 'The Shopify callback signature is missing.',
        code: 'invalid_shopify_hmac',
      });
    }

    const message = Object.keys(queryParams)
      .filter((key) => key !== 'hmac' && key !== 'signature' && queryParams[key] !== undefined)
      .sort()
      .map((key) => `${key}=${this.serializeQueryValue(queryParams[key])}`)
      .join('&');

    const computed = createHmac(
      'sha256',
      this.getRequiredConfig('environment.shopifyApiSecret'),
    )
      .update(message)
      .digest('hex');

    const providedBuffer = Buffer.from(providedHmac, 'hex');
    const computedBuffer = Buffer.from(computed, 'hex');

    if (
      providedBuffer.length !== computedBuffer.length ||
      !timingSafeEqual(providedBuffer, computedBuffer)
    ) {
      throw new BadRequestException({
        message: 'The Shopify callback signature could not be verified.',
        code: 'invalid_shopify_hmac',
      });
    }
  }

  parseAndValidateState(state: string, expectedShopDomain: string) {
    const [encodedPayload, signature] = state.split('.');
    if (!encodedPayload || !signature) {
      throw new BadRequestException({
        message: 'The Shopify OAuth state is invalid.',
        code: 'invalid_oauth_state',
      });
    }

    const expectedSignature = createHmac('sha256', this.getRequiredConfig('environment.encryptionKey'))
      .update(encodedPayload)
      .digest('base64url');

    if (
      Buffer.byteLength(signature) !== Buffer.byteLength(expectedSignature) ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      throw new BadRequestException({
        message: 'The Shopify OAuth state signature is invalid.',
        code: 'invalid_oauth_state',
      });
    }

    let payload: ShopifyStatePayload;
    try {
      payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as ShopifyStatePayload;
    } catch {
      throw new BadRequestException({
        message: 'The Shopify OAuth state payload is invalid.',
        code: 'invalid_oauth_state',
      });
    }

    if (payload.expiresAt < Date.now()) {
      throw new BadRequestException({
        message: 'The Shopify OAuth state has expired.',
        code: 'invalid_oauth_state',
      });
    }

    if (payload.shopDomain !== this.normalizeShopDomain(expectedShopDomain)) {
      throw new BadRequestException({
        message: 'The Shopify OAuth state does not match the requested shop domain.',
        code: 'invalid_oauth_state',
      });
    }

    return payload;
  }

  async exchangeCodeForAccessToken(shopDomain: string, code: string) {
    const normalizedShopDomain = this.normalizeShopDomain(shopDomain);
    const endpoint = `https://${normalizedShopDomain}/admin/oauth/access_token`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: this.getRequiredConfig('environment.shopifyApiKey'),
          client_secret: this.getRequiredConfig('environment.shopifyApiSecret'),
          code,
        }),
      });
    } catch (error) {
      throw new ServiceUnavailableException({
        message: 'The Shopify token exchange request could not be completed.',
        code: 'token_exchange_failed',
        details: error instanceof Error ? error.message : 'Unknown Shopify network failure',
      });
    }

    const payload = (await response.json().catch(() => null)) as ShopifyTokenResponse | null;

    if (!response.ok || !payload?.access_token) {
      throw new BadRequestException({
        message: 'The Shopify authorization code could not be exchanged for an access token.',
        code: 'token_exchange_failed',
        details: payload,
      });
    }

    return payload;
  }

  private generateState(input: {
    organizationId: string;
    userId: string;
    shopDomain: string;
  }) {
    const payload: ShopifyStatePayload = {
      organizationId: input.organizationId,
      userId: input.userId,
      shopDomain: input.shopDomain,
      nonce: randomBytes(16).toString('base64url'),
      issuedAt: Date.now(),
      expiresAt: Date.now() + this.oauthStateTtlMs,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.getRequiredConfig('environment.encryptionKey'))
      .update(encodedPayload)
      .digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  private serializeQueryValue(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
      return value.join(',');
    }

    return value ?? '';
  }

  private readSingleValue(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private getRequiredConfig(
    key:
      | 'environment.shopifyApiKey'
      | 'environment.shopifyApiSecret'
      | 'environment.shopifyRedirectUri'
      | 'environment.encryptionKey',
  ) {
    const resolvedKey = key.replace('environment.', '') as
      | 'shopifyApiKey'
      | 'shopifyApiSecret'
      | 'shopifyRedirectUri'
      | 'encryptionKey';
    const value = this.environment[resolvedKey];
    if (!value) {
      throw new InternalServerErrorException({
        message: 'Shopify configuration is missing.',
        code: 'missing_shopify_configuration',
      });
    }

    return String(value);
  }

  private get environment() {
    return this.configService.get('environment') as {
      shopifyApiKey: string;
      shopifyApiSecret: string;
      shopifyScopes: string[];
      shopifyRedirectUri: string;
      encryptionKey: string;
    };
  }
}
