import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import { Queue } from 'bullmq';

import { JOB_NAMES, JOB_QUEUE_NAMES } from '../../src/modules/jobs/job.constants';
import { JobsService } from '../../src/modules/jobs/jobs.service';

type AddedJob = {
  name: string;
  data: unknown;
  options: Record<string, unknown> | undefined;
};

function createQueue(name: string) {
  const added: AddedJob[] = [];
  const queue = {
    name,
    add: async (jobName: string, data: unknown, options?: Record<string, unknown>) => {
      added.push({ name: jobName, data, options });
      return { id: options?.jobId ?? `${name}-${added.length}` };
    },
  } as unknown as Queue;
  return { queue, added };
}

function createService() {
  const integration = createQueue(JOB_QUEUE_NAMES.integration);
  const intelligence = createQueue(JOB_QUEUE_NAMES.intelligence);
  const system = createQueue(JOB_QUEUE_NAMES.system);
  const deadLetter = createQueue(JOB_QUEUE_NAMES.deadLetter);

  return {
    service: new JobsService(
      integration.queue,
      intelligence.queue,
      system.queue,
      deadLetter.queue,
    ),
    integration,
    deadLetter,
  };
}

test('Shopify producer propagates organization and correlation identifiers without secrets', async () => {
  const { service, integration } = createService();
  const result = await service.enqueueShopifyInitialSync({
    organizationId: 'org-a',
    shopifyStoreId: 'store-a',
    executionKey: 'oauth-execution-1',
    requestedByUserId: 'user-a',
    correlationId: 'request-123',
    limit: 50,
  });

  assert.equal(result.jobName, JOB_NAMES.shopifyInitialSync);
  assert.equal(result.queue, JOB_QUEUE_NAMES.integration);
  assert.equal(result.correlationId, 'request-123');
  assert.equal(integration.added.length, 1);

  const data = integration.added[0].data as Record<string, unknown>;
  assert.equal(data.organizationId, 'org-a');
  assert.equal(data.requestedByUserId, 'user-a');
  assert.equal(data.correlationId, 'request-123');
  assert.deepEqual(data.payload, {
    shopifyStoreId: 'store-a',
    executionKey: 'oauth-execution-1',
    limit: 50,
  });
  assert.equal(JSON.stringify(data).includes('accessToken'), false);
  assert.equal(JSON.stringify(data).includes('password'), false);
});

test('same execution receives the same deterministic job ID while a later execution receives another', async () => {
  const { service, integration } = createService();

  await service.enqueueShopifyInitialSync({
    organizationId: 'org-a',
    shopifyStoreId: 'store-a',
    executionKey: 'execution-1',
    correlationId: 'one',
  });
  await service.enqueueShopifyInitialSync({
    organizationId: 'org-a',
    shopifyStoreId: 'store-a',
    executionKey: 'execution-1',
    correlationId: 'two',
  });
  await service.enqueueShopifyInitialSync({
    organizationId: 'org-a',
    shopifyStoreId: 'store-a',
    executionKey: 'execution-2',
    correlationId: 'three',
  });

  const firstId = integration.added[0].options?.jobId;
  const duplicateId = integration.added[1].options?.jobId;
  const laterId = integration.added[2].options?.jobId;
  assert.equal(firstId, duplicateId);
  assert.notEqual(firstId, laterId);
});
