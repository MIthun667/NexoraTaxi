import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';

import { CurrentPrincipal } from '../../src/common/interfaces/current-principal.interface';
import { PlatformLoggerService } from '../../src/common/services/platform-logger.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { ShopifyApiService } from '../../src/modules/integrations/shopify/shopify-api.service';
import { ShopifyAuthService } from '../../src/modules/integrations/shopify/shopify-auth.service';
import { ShopifyCryptoService } from '../../src/modules/integrations/shopify/shopify-crypto.service';
import { ShopifyService } from '../../src/modules/integrations/shopify/shopify.service';
import { ShopifySyncService } from '../../src/modules/integrations/shopify/shopify-sync.service';
import { ShopifyWebhookRegistrationService } from '../../src/modules/integrations/shopify/shopify-webhook-registration.service';

const principal: CurrentPrincipal = {
  userId: 'user-a',
  email: 'user-a@example.com',
  organizationId: 'org-a',
  roles: ['member'],
  permissions: ['intelligence.read', 'organization.manage'],
};

function createService() {
  const prisma = {
    organization: {
      findFirst: async ({ where }: { where: { id: string } }) =>
        where.id === 'org-a' ? { id: 'org-a' } : null,
    },
    integrationShopifyStore: {
      findFirst: async () => null,
    },
    shopifySyncRun: {
      findFirst: async () => null,
    },
  } as unknown as PrismaService;

  return new ShopifyService(
    prisma,
    {} as AuditService,
    {
      normalizeShopDomain: (shopDomain: string) => shopDomain,
      generateInstallUrl: () => ({
        installUrl: 'https://shop-a.myshopify.com/admin/oauth/authorize',
        state: 'state',
        stateExpiresAt: new Date(Date.now() + 60_000),
      }),
    } as unknown as ShopifyAuthService,
    {} as ShopifyCryptoService,
    {} as ShopifyApiService,
    {} as ShopifySyncService,
    {} as ShopifyWebhookRegistrationService,
    new ConfigService({ environment: { shopifyApiVersion: '2026-01', shopifyAppUrl: 'https://app.test' } }),
    {} as PlatformLoggerService,
  );
}

test('Shopify cross-tenant read is denied', async () => {
  const service = createService();

  await assert.rejects(
    service.getConnectionStatus(principal, 'org-b'),
    ForbiddenException,
  );
});

test('Shopify cross-tenant mutation is denied', async () => {
  const service = createService();

  await assert.rejects(
    service.connectOrganizationStore(principal, {
      organizationId: 'org-b',
      shopDomain: 'shop-b.myshopify.com',
    }),
    ForbiddenException,
  );
});

test('Shopify same-tenant read remains available', async () => {
  const service = createService();
  const response = await service.getConnectionStatus(principal, 'org-a');

  assert.equal(response.data.connected, false);
  assert.equal(response.data.syncCoverage, 'NONE');
});
