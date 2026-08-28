import { JOB_ENVELOPE_VERSION } from './job.constants';

export interface JobEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  version: typeof JOB_ENVELOPE_VERSION;
  correlationId: string;
  organizationId?: string;
  requestedByUserId?: string;
  resourceType?: string;
  resourceId?: string;
  payload: TPayload;
}

export interface ShopifyInitialSyncPayload extends Record<string, unknown> {
  shopifyStoreId: string;
  executionKey: string;
  limit?: number;
}

export interface DeadLetterPayload extends Record<string, unknown> {
  originalJobId: string;
  originalJobName: string;
  originalQueue: string;
  organizationId?: string;
  correlationId: string;
  attemptCount: number;
  errorName: string;
  errorMessage: string;
  failedAt: string;
}

export function assertJobEnvelope(value: unknown): asserts value is JobEnvelope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Job envelope must be an object.');
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.version !== JOB_ENVELOPE_VERSION) {
    throw new Error(`Unsupported job envelope version: ${String(candidate.version)}.`);
  }

  if (typeof candidate.correlationId !== 'string' || candidate.correlationId.trim().length === 0) {
    throw new Error('Job envelope correlationId is required.');
  }

  for (const field of ['organizationId', 'requestedByUserId', 'resourceType', 'resourceId']) {
    const fieldValue = candidate[field];
    if (fieldValue !== undefined && (typeof fieldValue !== 'string' || fieldValue.trim().length === 0)) {
      throw new Error(`Job envelope ${field} must be a non-empty string when provided.`);
    }
  }

  if (!candidate.payload || typeof candidate.payload !== 'object' || Array.isArray(candidate.payload)) {
    throw new Error('Job envelope payload must be an object.');
  }
}

export function assertShopifyInitialSyncEnvelope(
  value: unknown,
): asserts value is JobEnvelope<ShopifyInitialSyncPayload> {
  assertJobEnvelope(value);
  const envelope = value as JobEnvelope<Record<string, unknown>>;

  if (!envelope.organizationId) {
    throw new Error('Shopify sync jobs require organizationId.');
  }

  const { shopifyStoreId, executionKey, limit } = envelope.payload;
  if (typeof shopifyStoreId !== 'string' || shopifyStoreId.trim().length === 0) {
    throw new Error('Shopify initial sync requires shopifyStoreId.');
  }
  if (typeof executionKey !== 'string' || executionKey.trim().length === 0) {
    throw new Error('Shopify initial sync requires executionKey.');
  }
  if (limit !== undefined && (!Number.isInteger(limit) || Number(limit) <= 0)) {
    throw new Error('Shopify initial sync limit must be a positive integer when provided.');
  }
}
