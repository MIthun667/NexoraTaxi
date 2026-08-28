import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import { Request, Response } from 'express';

import { PlatformLoggerService } from '../../src/common/services/platform-logger.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { ShopifyCallbackDto } from '../../src/modules/integrations/shopify/dto/shopify-callback.dto';
import { ShopifyController } from '../../src/modules/integrations/shopify/shopify.controller';
import { ShopifyService } from '../../src/modules/integrations/shopify/shopify.service';
import { JobsService } from '../../src/modules/jobs/jobs.service';

function createHarness(queueShouldFail = false) {
  const queued: Array<Record<string, unknown>> = [];
  const audited: Array<Record<string, unknown>> = [];
  let redirectTarget: string | undefined;

  const shopifyService = {
    handleOAuthCallback: async () => ({
      data: {
        store: {
          id: 'store-a',
          organizationId: 'org-a',
          shopDomain: 'shop-a.myshopify.com',
        },
        redirectUrl: 'https://app.test/shopify/onboarding?status=connected',
      },
    }),
  } as unknown as ShopifyService;
  const jobsService = {
    enqueueShopifyInitialSync: async (input: Record<string, unknown>) => {
      queued.push(input);
      if (queueShouldFail) {
        throw new Error('redis unavailable');
      }
      return { jobId: 'job-a', correlationId: 'request-a' };
    },
  } as unknown as JobsService;
  const auditService = {
    record: async (entry: Record<string, unknown>) => {
      audited.push(entry);
    },
  } as unknown as AuditService;
  const logger = {
    warn: () => undefined,
  } as unknown as PlatformLoggerService;
  const controller = new ShopifyController(shopifyService, jobsService, auditService, logger);
  const response = {
    redirect: (target: string) => {
      redirectTarget = target;
      return undefined;
    },
  } as unknown as Response;
  const request = { query: {} } as Request;
  const query = {
    code: 'oauth-code',
    hmac: 'hmac',
    shop: 'shop-a.myshopify.com',
    state: 'signed-oauth-state',
  } as ShopifyCallbackDto;

  return {
    controller,
    request,
    response,
    query,
    queued,
    audited,
    getRedirectTarget: () => redirectTarget,
  };
}

test('OAuth completion queues initial sync exactly once and preserves redirect behavior', async () => {
  const harness = createHarness();
  await harness.controller.callback(harness.query, harness.request, harness.response);

  assert.equal(harness.queued.length, 1);
  assert.equal(harness.queued[0].organizationId, 'org-a');
  assert.equal(harness.queued[0].shopifyStoreId, 'store-a');
  assert.equal(typeof harness.queued[0].executionKey, 'string');
  assert.equal(harness.audited.length, 1);
  assert.equal(harness.getRedirectTarget(), 'https://app.test/shopify/onboarding?status=connected');
});

test('queue outage does not break successful Shopify OAuth redirect', async () => {
  const harness = createHarness(true);
  await harness.controller.callback(harness.query, harness.request, harness.response);

  assert.equal(harness.queued.length, 1);
  assert.equal(harness.audited.length, 0);
  assert.equal(harness.getRedirectTarget(), 'https://app.test/shopify/onboarding?status=connected');
});
