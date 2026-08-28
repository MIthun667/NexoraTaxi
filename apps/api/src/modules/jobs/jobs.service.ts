import { createHash, randomUUID } from 'node:crypto';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';

import { RequestContextStorage } from '../../common/utils/request-context.util';
import {
  assertJobEnvelope,
  DeadLetterPayload,
  JobEnvelope,
  ShopifyInitialSyncPayload,
} from './job.contracts';
import { JOB_ENVELOPE_VERSION, JOB_NAMES, JOB_QUEUE_NAMES, JobName, JobQueueName } from './job.constants';

export interface EnqueueJobOptions {
  idempotencyKey?: string;
}

export interface ShopifyInitialSyncRequest {
  organizationId: string;
  shopifyStoreId: string;
  executionKey: string;
  requestedByUserId?: string;
  correlationId?: string;
  limit?: number;
}

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(JOB_QUEUE_NAMES.integration)
    private readonly integrationQueue: Queue,
    @InjectQueue(JOB_QUEUE_NAMES.intelligence)
    private readonly intelligenceQueue: Queue,
    @InjectQueue(JOB_QUEUE_NAMES.system)
    private readonly systemQueue: Queue,
    @InjectQueue(JOB_QUEUE_NAMES.deadLetter)
    private readonly deadLetterQueue: Queue,
  ) {}

  async enqueue<TPayload extends Record<string, unknown>>(
    queueName: JobQueueName,
    jobName: JobName,
    envelope: JobEnvelope<TPayload>,
    options: EnqueueJobOptions = {},
  ) {
    assertJobEnvelope(envelope);
    const queue = this.getQueue(queueName);
    const jobId = options.idempotencyKey
      ? this.createDeterministicJobId(jobName, options.idempotencyKey)
      : undefined;

    const job = await queue.add(jobName, envelope, jobId ? { jobId } : undefined);
    return {
      jobId: String(job.id),
      jobName,
      queue: queueName,
      correlationId: envelope.correlationId,
    };
  }

  async enqueueShopifyInitialSync(request: ShopifyInitialSyncRequest) {
    const envelope: JobEnvelope<ShopifyInitialSyncPayload> = {
      version: JOB_ENVELOPE_VERSION,
      correlationId: request.correlationId ?? RequestContextStorage.getRequestId() ?? randomUUID(),
      organizationId: request.organizationId,
      requestedByUserId: request.requestedByUserId,
      resourceType: 'integration-shopify-store',
      resourceId: request.shopifyStoreId,
      payload: {
        shopifyStoreId: request.shopifyStoreId,
        executionKey: request.executionKey,
        ...(request.limit ? { limit: request.limit } : {}),
      },
    };

    return this.enqueue(
      JOB_QUEUE_NAMES.integration,
      JOB_NAMES.shopifyInitialSync,
      envelope,
      { idempotencyKey: request.executionKey },
    );
  }

  async recordFinalFailure(job: Job, queueName: JobQueueName, error: Error) {
    const candidate = job.data as unknown;
    let organizationId: string | undefined;
    let correlationId = randomUUID();

    try {
      assertJobEnvelope(candidate);
      organizationId = candidate.organizationId;
      correlationId = candidate.correlationId;
    } catch {
      // Invalid envelopes are still diagnosable without copying their unsafe payload.
    }

    const payload: DeadLetterPayload = {
      originalJobId: String(job.id ?? 'unknown'),
      originalJobName: job.name,
      originalQueue: queueName,
      organizationId,
      correlationId,
      attemptCount: job.attemptsMade,
      errorName: error.name || 'Error',
      errorMessage: this.sanitizeErrorMessage(error.message),
      failedAt: new Date().toISOString(),
    };

    const envelope: JobEnvelope<DeadLetterPayload> = {
      version: JOB_ENVELOPE_VERSION,
      correlationId,
      organizationId,
      resourceType: 'failed-job',
      resourceId: payload.originalJobId,
      payload,
    };

    return this.deadLetterQueue.add(JOB_NAMES.deadLetterRecord, envelope, {
      jobId: this.createDeterministicJobId(
        JOB_NAMES.deadLetterRecord,
        `${queueName}|${payload.originalJobId}`,
      ),
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false,
    });
  }

  createDeterministicJobId(jobName: string, idempotencyKey: string): string {
    return createHash('sha256')
      .update(`${jobName}|${idempotencyKey}`)
      .digest('hex');
  }

  private getQueue(queueName: JobQueueName): Queue {
    switch (queueName) {
      case JOB_QUEUE_NAMES.integration:
        return this.integrationQueue;
      case JOB_QUEUE_NAMES.intelligence:
        return this.intelligenceQueue;
      case JOB_QUEUE_NAMES.system:
        return this.systemQueue;
      case JOB_QUEUE_NAMES.deadLetter:
        return this.deadLetterQueue;
    }
  }

  private sanitizeErrorMessage(message: string): string {
    return message
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
      .replace(/(access[_-]?token|password|secret|api[_-]?key)\s*[=:]\s*[^\s,;]+/gi, '$1=[REDACTED]')
      .slice(0, 500);
  }
}
