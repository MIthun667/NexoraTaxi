import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import { UnrecoverableError } from 'bullmq';

import { PlatformLoggerService } from '../../src/common/services/platform-logger.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { JOB_ENVELOPE_VERSION, JOB_NAMES } from '../../src/modules/jobs/job.constants';
import { JobsService } from '../../src/modules/jobs/jobs.service';
import { IntegrationJobsProcessor } from '../../src/modules/jobs/processors/integration-jobs.processor';
import { ShopifySyncService } from '../../src/modules/integrations/shopify/shopify-sync.service';

function createJob(organizationId = 'org-a') {
  return {
    id: 'job-1',
    name: JOB_NAMES.shopifyInitialSync,
    attemptsMade: 0,
    opts: { attempts: 3 },
    data: {
      version: JOB_ENVELOPE_VERSION,
      correlationId: 'request-1',
      organizationId,
      requestedByUserId: 'user-a',
      resourceType: 'integration-shopify-store',
      resourceId: 'store-a',
      payload: {
        shopifyStoreId: 'store-a',
        executionKey: 'execution-1',
      },
    },
  } as never;
}

function createProcessor(storeOrganizationId = 'org-a') {
  let syncCalls = 0;
  const prisma = {
    integrationShopifyStore: {
      findFirst: async ({ where }: { where: { organizationId: string; id: string } }) =>
        where.organizationId === storeOrganizationId && where.id === 'store-a'
          ? { id: 'store-a', organizationId: storeOrganizationId, shopDomain: 'shop-a.myshopify.com' }
          : null,
    },
  } as unknown as PrismaService;
  const sync = {
    syncAllSystem: async () => {
      syncCalls += 1;
      return { data: { id: 'sync-1', status: 'SUCCEEDED' } };
    },
  } as unknown as ShopifySyncService;
  const jobs = { recordFinalFailure: async () => undefined } as unknown as JobsService;
  const audit = { record: async () => undefined } as unknown as AuditService;
  const logger = { log: () => undefined, warn: () => undefined } as unknown as PlatformLoggerService;

  return {
    processor: new IntegrationJobsProcessor(prisma, sync, jobs, audit, logger),
    getSyncCalls: () => syncCalls,
  };
}

test('initial-sync processor invokes existing Shopify sync service exactly once', async () => {
  const { processor, getSyncCalls } = createProcessor();
  const result = await processor.process(createJob());

  assert.equal(getSyncCalls(), 1);
  assert.deepEqual(result, {
    organizationId: 'org-a',
    shopifyStoreId: 'store-a',
    syncRunId: 'sync-1',
    syncStatus: 'SUCCEEDED',
  });
});

test('processor rejects a Shopify resource outside the job organization', async () => {
  const { processor, getSyncCalls } = createProcessor('org-b');
  await assert.rejects(processor.process(createJob('org-a')), UnrecoverableError);
  assert.equal(getSyncCalls(), 0);
});

test('processor rejects unsupported job types without entering domain logic', async () => {
  const { processor, getSyncCalls } = createProcessor();
  const job = createJob() as { name: string };
  job.name = 'message.process';
  await assert.rejects(processor.process(job as never), UnrecoverableError);
  assert.equal(getSyncCalls(), 0);
});
