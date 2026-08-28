import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';

import { Job, Queue, QueueEvents, Worker } from 'bullmq';

import { JOB_NAMES, JOB_QUEUE_NAMES } from '../../src/modules/jobs/job.constants';
import { buildDefaultJobOptions, parseRedisConnection } from '../../src/modules/jobs/job-config.util';
import { JobsService } from '../../src/modules/jobs/jobs.service';

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const connection = parseRedisConnection(redisUrl);
const prefix = `${process.env.JOB_QUEUE_PREFIX ?? 'nexora-test'}:queue-runtime:${randomUUID()}`;
const defaultJobOptions = buildDefaultJobOptions(3, 50);

let integrationQueue: Queue;
let intelligenceQueue: Queue;
let systemQueue: Queue;
let deadLetterQueue: Queue;
let queueEvents: QueueEvents;
let worker: Worker;
let service: JobsService;
const executions = new Map<string, number>();

before(async () => {
  integrationQueue = new Queue(JOB_QUEUE_NAMES.integration, { connection, prefix, defaultJobOptions });
  intelligenceQueue = new Queue(JOB_QUEUE_NAMES.intelligence, { connection, prefix, defaultJobOptions });
  systemQueue = new Queue(JOB_QUEUE_NAMES.system, { connection, prefix, defaultJobOptions });
  deadLetterQueue = new Queue(JOB_QUEUE_NAMES.deadLetter, { connection, prefix, defaultJobOptions });
  queueEvents = new QueueEvents(JOB_QUEUE_NAMES.integration, { connection, prefix });
  await queueEvents.waitUntilReady();

  service = new JobsService(integrationQueue, intelligenceQueue, systemQueue, deadLetterQueue);
  worker = new Worker(
    JOB_QUEUE_NAMES.integration,
    async (job: Job) => {
      const executionKey = String(job.data.payload.executionKey);
      const count = (executions.get(executionKey) ?? 0) + 1;
      executions.set(executionKey, count);

      if (executionKey.startsWith('retry-') && count === 1) {
        throw new Error('temporary upstream failure');
      }
      if (executionKey.startsWith('fail-')) {
        throw new Error('persistent upstream failure');
      }

      return { executionKey, count };
    },
    { connection, prefix, concurrency: 2 },
  );
  await worker.waitUntilReady();

  worker.on('failed', (job, error) => {
    if (!job) return;
    const maxAttempts = Number(job.opts.attempts ?? 1);
    if (job.attemptsMade >= maxAttempts) {
      void service.recordFinalFailure(job, JOB_QUEUE_NAMES.integration, error);
    }
  });
});

after(async () => {
  await worker.close();
  await queueEvents.close();
  for (const queue of [integrationQueue, intelligenceQueue, systemQueue, deadLetterQueue]) {
    await queue.obliterate({ force: true });
    await queue.close();
  }
});

test('producer enqueues through Redis and worker completes the job', async () => {
  const executionKey = `success-${randomUUID()}`;
  const queued = await service.enqueueShopifyInitialSync({
    organizationId: 'org-a',
    shopifyStoreId: 'store-a',
    executionKey,
    correlationId: 'request-success',
  });
  const job = await integrationQueue.getJob(queued.jobId);
  assert.ok(job);

  const result = await job.waitUntilFinished(queueEvents, 5000);
  assert.deepEqual(result, { executionKey, count: 1 });
  assert.equal(executions.get(executionKey), 1);
});

test('transient failure retries and then succeeds', async () => {
  const executionKey = `retry-${randomUUID()}`;
  const queued = await service.enqueueShopifyInitialSync({
    organizationId: 'org-a',
    shopifyStoreId: 'store-a',
    executionKey,
    correlationId: 'request-retry',
  });
  const job = await integrationQueue.getJob(queued.jobId);
  assert.ok(job);

  const result = await job.waitUntilFinished(queueEvents, 5000);
  assert.deepEqual(result, { executionKey, count: 2 });
  assert.equal(executions.get(executionKey), 2);
});

test('same execution is idempotent while a legitimate later execution remains possible', async () => {
  const executionKey = `idempotent-${randomUUID()}`;
  const first = await service.enqueueShopifyInitialSync({
    organizationId: 'org-a',
    shopifyStoreId: 'store-a',
    executionKey,
    correlationId: 'request-idem-1',
  });
  const duplicate = await service.enqueueShopifyInitialSync({
    organizationId: 'org-a',
    shopifyStoreId: 'store-a',
    executionKey,
    correlationId: 'request-idem-2',
  });
  assert.equal(first.jobId, duplicate.jobId);

  const firstJob = await integrationQueue.getJob(first.jobId);
  assert.ok(firstJob);
  await firstJob.waitUntilFinished(queueEvents, 5000);
  assert.equal(executions.get(executionKey), 1);

  const laterExecutionKey = `${executionKey}-later`;
  const later = await service.enqueueShopifyInitialSync({
    organizationId: 'org-a',
    shopifyStoreId: 'store-a',
    executionKey: laterExecutionKey,
    correlationId: 'request-idem-later',
  });
  assert.notEqual(first.jobId, later.jobId);
  const laterJob = await integrationQueue.getJob(later.jobId);
  assert.ok(laterJob);
  await laterJob.waitUntilFinished(queueEvents, 5000);
  assert.equal(executions.get(laterExecutionKey), 1);
});

test('exhausted retries produce a safe dead-letter record', async () => {
  const executionKey = `fail-${randomUUID()}`;
  const queued = await service.enqueueShopifyInitialSync({
    organizationId: 'org-a',
    shopifyStoreId: 'store-a',
    executionKey,
    correlationId: 'request-failure',
  });
  const job = await integrationQueue.getJob(queued.jobId);
  assert.ok(job);

  await assert.rejects(job.waitUntilFinished(queueEvents, 10000));

  const deadline = Date.now() + 3000;
  let failedRecord: Job | undefined;
  while (Date.now() < deadline && !failedRecord) {
    const records = await deadLetterQueue.getJobs(['waiting', 'delayed', 'completed']);
    failedRecord = records.find((record) => record.name === JOB_NAMES.deadLetterRecord);
    if (!failedRecord) await new Promise((resolve) => setTimeout(resolve, 50));
  }

  assert.ok(failedRecord);
  assert.equal(failedRecord.data.organizationId, 'org-a');
  assert.equal(failedRecord.data.correlationId, 'request-failure');
  assert.equal(failedRecord.data.payload.originalJobId, queued.jobId);
  assert.equal(JSON.stringify(failedRecord.data).includes('accessToken'), false);
  assert.equal(executions.get(executionKey), 3);
});
