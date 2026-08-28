# Durable job execution

Nexora uses Redis and BullMQ for durable asynchronous work. Queue initialization is centralized in `apps/api/src/modules/jobs`; feature modules enqueue through `JobsService` rather than creating Redis/BullMQ clients directly.

## Runtime flow

```text
API request / domain event
  -> validate + authorize + persist
  -> JobsService enqueue
  -> Redis / BullMQ
  -> worker-bootstrap -> WorkerModule
  -> queue processor
  -> existing domain service
  -> audit + structured job logs
```

The HTTP API is a producer. The worker is the consumer. The worker has a dedicated Nest application context and does not boot the HTTP application module.

## Queues and jobs

Current queue boundaries are `integration`, `intelligence`, `system`, and `dead-letter`. They separate external integration workloads from future intelligence/system workloads without creating one queue per function. Only the existing Shopify workload is processed in this phase: `shopify.initial_sync` on `integration`. Other centralized names are future-safe contracts, not implemented processors.

Every payload uses versioned envelope `version: 1` and carries only identifiers/safe data. Credentials, JWTs, passwords, encryption keys, API secrets, Shopify access tokens, and full sensitive customer objects are never queued. Processors reload credentials/state using resource IDs.

## Configuration and isolation

Required runtime settings are:

- `REDIS_URL`
- `JOB_QUEUE_PREFIX`
- `JOB_DEFAULT_ATTEMPTS` (default 3)
- `JOB_BACKOFF_MS` (default 1000 ms)
- `WORKER_CONCURRENCY` (default 5)

The effective BullMQ prefix combines `JOB_QUEUE_PREFIX` and `NODE_ENV`. CI adds a run-unique prefix. Staging uses a staging-specific base prefix even though the application runs with production Node semantics. Production must provide `REDIS_URL` through the existing secret/config mechanism.

## Retry and failure policy

Jobs use bounded exponential retry: three attempts by default, starting at a 1000 ms delay. Invalid job contracts, unsupported job types, or organization/resource mismatches are `UnrecoverableError`s and are not retried as transient failures.

After final failure, a sanitized diagnostic envelope is written to the `dead-letter` queue. It contains only job ID/name/queue, organization and correlation identifiers where available, attempt count, sanitized error name/message, and failure timestamp. Failed source jobs remain retained for diagnosis.

## Idempotency

Shopify initial sync derives an execution key from the signed OAuth state. `JobsService` hashes the job name plus that execution key into a deterministic BullMQ job ID. Re-delivery of the same OAuth execution therefore maps to one job, while a later OAuth execution receives a different ID. Domain sync itself continues to use the existing Shopify upsert/sync behavior.

## Shopify OAuth

After OAuth has validated, stored the encrypted token, persisted the store, and attempted webhook registration, the callback enqueues `shopify.initial_sync` and redirects normally. It does not wait for business-data synchronization. If Redis is temporarily unavailable at this point, OAuth success/redirect is preserved and the enqueue failure is logged without secrets. Existing manual Shopify sync endpoints remain synchronous and backwards-compatible.

The worker validates that the queued store ID is active and belongs to the envelope organization before invoking the existing `ShopifySyncService.syncAllSystem` method. Queue origin is never treated as authorization by itself.

## Observability and health

Job logs include job ID, job name, queue, organization ID, correlation ID, attempt, duration, and status. Payloads/secrets are not logged. Business-relevant Shopify initial-sync requested/started/completed/final-failed transitions are written to the existing audit infrastructure.

Redis is mandatory for API readiness because it backs both background jobs and distributed authentication rate limiting. `/health/readiness` checks PostgreSQL and Redis as mandatory dependencies; detailed `/health/redis` remains authenticated, consistent with other detailed diagnostics.

Authentication login/refresh limiting uses an atomic Redis Lua operation (`INCR` plus first-hit `EXPIRE`) so multiple API replicas share the same counters. If Redis protection is unavailable, authentication rate limiting fails closed with service unavailable instead of silently bypassing protection.

## Local development

Start PostgreSQL and Redis with:

```bash
pnpm dev:deps:up
```

The development Compose stack gives API and worker `redis://redis:6379` and waits for Redis health. The worker image still starts `node dist/apps/api/worker-bootstrap.js`. Database setup is migration-driven; `dev:setup` and the seed Compose profile no longer run `prisma db push`.

## Production considerations

Use a managed/high-availability Redis endpoint through `REDIS_URL`, set environment-specific queue prefixes, tune concurrency to downstream rate limits and database capacity, and keep graceful termination long enough for active jobs to drain. Kubernetes gives the worker a 60-second termination grace period. No scheduler, Meta integration, messaging pipeline, or new commerce domain is introduced by this phase.
