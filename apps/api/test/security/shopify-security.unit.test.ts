import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ShopifyAuthService } from '../../src/modules/integrations/shopify/shopify-auth.service';
import { ShopifyWebhookController } from '../../src/modules/integrations/shopify/shopify-webhook.controller';
import { ShopifyWebhookRegistrationService } from '../../src/modules/integrations/shopify/shopify-webhook-registration.service';
import { ShopifyWebhookService } from '../../src/modules/integrations/shopify/shopify-webhook.service';
import { ShopifyWebhookValidatorService } from '../../src/modules/integrations/shopify/shopify-webhook-validator.service';

const shopifyApiSecret = 'shopify-test-secret-which-is-long-enough';
const encryptionKey = 'oauth-state-signing-key-which-is-long-enough';

function createConfigService() {
  return new ConfigService({
    environment: {
      shopifyApiKey: 'shopify-api-key',
      shopifyApiSecret,
      shopifyScopes: ['read_products'],
      shopifyRedirectUri: 'https://example.test/api/v1/integrations/shopify/callback',
      encryptionKey,
    },
  });
}

function signWebhook(rawBody: Buffer) {
  return createHmac('sha256', shopifyApiSecret).update(rawBody).digest('base64');
}

function signCallback(query: Record<string, string>) {
  const message = Object.keys(query)
    .sort()
    .map((key) => `${key}=${query[key]}`)
    .join('&');
  return createHmac('sha256', shopifyApiSecret).update(message).digest('hex');
}

function createState(payload: {
  organizationId: string;
  userId: string;
  shopDomain: string;
  expiresAt: number;
}) {
  const encodedPayload = Buffer.from(
    JSON.stringify({
      ...payload,
      nonce: 'test-nonce',
      issuedAt: Date.now() - 1000,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', encryptionKey)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

test('valid Shopify callback HMAC is accepted', () => {
  const service = new ShopifyAuthService(createConfigService());
  const query = {
    code: 'authorization-code',
    shop: 'shop-a.myshopify.com',
    state: 'state-value',
  };

  assert.doesNotThrow(() =>
    service.validateCallbackHmac({ ...query, hmac: signCallback(query) }),
  );
});

test('invalid Shopify callback HMAC is rejected', () => {
  const service = new ShopifyAuthService(createConfigService());

  assert.throws(
    () =>
      service.validateCallbackHmac({
        code: 'authorization-code',
        shop: 'shop-a.myshopify.com',
        state: 'state-value',
        hmac: '00'.repeat(32),
      }),
    BadRequestException,
  );
});

test('expired Shopify OAuth state is rejected', () => {
  const service = new ShopifyAuthService(createConfigService());
  const state = createState({
    organizationId: 'org-a',
    userId: 'user-a',
    shopDomain: 'shop-a.myshopify.com',
    expiresAt: Date.now() - 1,
  });

  assert.throws(
    () => service.parseAndValidateState(state, 'shop-a.myshopify.com'),
    BadRequestException,
  );
});

test('Shopify OAuth state with mismatched shop is rejected', () => {
  const service = new ShopifyAuthService(createConfigService());
  const state = createState({
    organizationId: 'org-a',
    userId: 'user-a',
    shopDomain: 'shop-a.myshopify.com',
    expiresAt: Date.now() + 60_000,
  });

  assert.throws(
    () => service.parseAndValidateState(state, 'shop-b.myshopify.com'),
    BadRequestException,
  );
});

test('tampering organization in OAuth state invalidates its signature', () => {
  const service = new ShopifyAuthService(createConfigService());
  const install = service.generateInstallUrl({
    organizationId: 'org-a',
    userId: 'user-a',
    shopDomain: 'shop-a.myshopify.com',
  });
  const [encodedPayload, signature] = install.state.split('.');
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Record<string, unknown>;
  payload.organizationId = 'org-b';
  const tampered = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${signature}`;

  assert.throws(
    () => service.parseAndValidateState(tampered, 'shop-a.myshopify.com'),
    BadRequestException,
  );
});

test('valid Shopify webhook HMAC is accepted', () => {
  const validator = new ShopifyWebhookValidatorService(createConfigService());
  const rawBody = Buffer.from('{"id":123,"topic":"products/update"}');

  assert.doesNotThrow(() => validator.validateSignature(rawBody, signWebhook(rawBody)));
});

test('invalid Shopify webhook HMAC is rejected', () => {
  const validator = new ShopifyWebhookValidatorService(createConfigService());
  const rawBody = Buffer.from('{"id":123}');

  assert.throws(
    () => validator.validateSignature(rawBody, 'invalid-signature'),
    BadRequestException,
  );
});

test('missing Shopify webhook HMAC is rejected', () => {
  const validator = new ShopifyWebhookValidatorService(createConfigService());

  assert.throws(
    () => validator.validateSignature(Buffer.from('{}'), undefined),
    BadRequestException,
  );
});

test('webhook controller rejects delivery when exact raw body is unavailable', () => {
  const registrationService = {} as ShopifyWebhookRegistrationService;
  const webhookService = {
    processWebhookDelivery: () => {
      throw new Error('must not be called without raw body');
    },
  } as unknown as ShopifyWebhookService;
  const controller = new ShopifyWebhookController(registrationService, webhookService);

  assert.throws(
    () => controller.receive({ headers: {}, body: { id: 123 } } as never),
    BadRequestException,
  );
});
