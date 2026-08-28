import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';

import { PlatformLoggerService } from '../../../common/services/platform-logger.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopifySyncService } from '../../integrations/shopify/shopify-sync.service';
import { assertShopifyInitialSyncEnvelope } from '../job.contracts';
import { JOB_NAMES, JOB_QUEUE_NAMES } from '../job.constants';
import { JobsService } from '../jobs.service';

const configuredConcurrency = Number(process.env.WORKER_CONCURRENCY ?? 5);
const workerConcurrency = Number.isInteger(configuredConcurrency) && configuredConcurrency > 0
  ? configuredConcurrency
  : 5;

@Processor(JOB_QUEUE_NAMES.integration, { concurrency: workerConcurrency })
export class IntegrationJobsProcessor extends WorkerHost {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly shopifySyncService: ShopifySyncService,
    private readonly jobsService: JobsService,
    private readonly logger: PlatformLoggerService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name !== JOB_NAMES.shopifyInitialSync) {
      throw new UnrecoverableError(`Unsupported integration job type: ${job.name}`);
    }

    try {
      assertShopifyInitialSyncEnvelope(job.data);
    } catch (error) {
      throw new UnrecoverableError(
        error instanceof Error ? error.message : 'Invalid Shopify initial-sync job envelope.',
      );
    }

    const envelope = job.data;
    const store = await this.prismaService.integrationShopifyStore.findFirst({
      where: {
        id: envelope.payload.shopifyStoreId,
        organizationId: envelope.organizationId,
        isActive: true,
      },
      select: { id: true, organizationId: true },
    });

    if (!store || envelope.resourceId !== store.id) {
      throw new UnrecoverableError('Shopify job resource does not belong to the requested organization.');
    }

    const result = await this.shopifySyncService.syncAllSystem(
      envelope.organizationId,
      envelope.payload.limit,
    );

    return {
      organizationId: envelope.organizationId,
      shopifyStoreId: store.id,
      syncRunId: result.data.id,
      syncStatus: result.data.status,
    };
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    const data = job.data as { organizationId?: string; correlationId?: string };
    this.logger.log({
      event: 'job.processing.started',
      jobId: String(job.id),
      jobName: job.name,
      queue: JOB_QUEUE_NAMES.integration,
      organizationId: data?.organizationId,
      correlationId: data?.correlationId,
      attempt: job.attemptsMade + 1,
      status: 'started',
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    const data = job.data as { organizationId?: string; correlationId?: string };
    this.logger.log({
      event: 'job.processing.completed',
      jobId: String(job.id),
      jobName: job.name,
      queue: JOB_QUEUE_NAMES.integration,
      organizationId: data?.organizationId,
      correlationId: data?.correlationId,
      attempt: job.attemptsMade,
      durationMs: job.processedOn ? Date.now() - job.processedOn : undefined,
      status: 'completed',
    });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error) {
    if (!job) {
      return;
    }

    const data = job.data as { organizationId?: string; correlationId?: string };
    const maxAttempts = Number(job.opts.attempts ?? 1);
    const isFinalFailure = error.name === 'UnrecoverableError' || job.attemptsMade >= maxAttempts;

    this.logger.warn({
      event: isFinalFailure ? 'job.processing.final_failed' : 'job.processing.retry_scheduled',
      jobId: String(job.id),
      jobName: job.name,
      queue: JOB_QUEUE_NAMES.integration,
      organizationId: data?.organizationId,
      correlationId: data?.correlationId,
      attempt: job.attemptsMade,
      durationMs: job.processedOn ? Date.now() - job.processedOn : undefined,
      status: isFinalFailure ? 'failed' : 'retrying',
      errorName: error.name,
    });

    if (isFinalFailure) {
      await this.jobsService.recordFinalFailure(job, JOB_QUEUE_NAMES.integration, error);
    }
  }
}
