# Deployment and Infrastructure Architecture

## Section 1 - Deployment environments

### Local development
- Purpose: fast inner-loop development on a single machine.
- Stack: local Postgres, local Redis, local Ollama, NestJS watch mode, Next.js dev server.
- Characteristics:
  - seeded demo data enabled
  - lower security posture
  - local object storage or mock connectors
  - single-node runtime

### Development server
- Purpose: shared environment for backend/frontend integration.
- Stack: containerized services with a shared database and Redis.
- Characteristics:
  - stable URLs
  - demo connectors
  - smoke-tested deploys
  - persistent seeded tenant data

### Staging
- Purpose: pre-production validation of SaaS flows and infrastructure changes.
- Stack: near-production topology with production-like secrets and network shape.
- Characteristics:
  - production-grade build artifacts
  - migrations applied automatically or via release gate
  - synthetic monitoring enabled
  - smoke tests and rollback rehearsal

### Production
- Purpose: customer-facing SaaS runtime.
- Characteristics:
  - isolated secrets and credentials
  - HA API and web replicas
  - dedicated worker pool
  - managed Postgres, Redis, object storage, and monitoring
  - backup and disaster recovery policies enforced

## Section 2 - Infrastructure components

### API servers
- Host NestJS HTTP APIs.
- Serve auth, operations, AI runtime orchestration, observability, and integrations.

### AI runtime servers
- Host Ollama and model cache.
- Serve structured inference, retrieval-backed reasoning, and report generation tasks.

### Database servers
- PostgreSQL primary plus optional read replicas.
- Hold transactional SoR, AI traces, reports, governance, billing, and seed/demo data.

### Cache layer
- Redis for rate limiting, queue coordination, transient execution context, and token caching.

### Message queues
- Redis-backed queue layer recommended for agent runs, connector syncs, reports, and escalations.
- BullMQ is the practical next fit for the existing NestJS stack.

### Object storage
- S3-compatible storage for credential documents, exported reports, AI artifacts, and large evidence blobs.

### Monitoring stack
- Prometheus for metrics scraping.
- Grafana for dashboards.
- Loki or ELK-compatible sink for structured logs.
- Alertmanager for paging and routing.

## Section 3 - Containerization strategy

### API container
- Dockerfile: `docker/Dockerfile.api`
- Multi-stage build:
  - install deps
  - generate Prisma client
  - compile NestJS
  - runtime image with production dependencies
- Entrypoint: `docker/entrypoints/api-start.sh`
- Optional boot migration via `RUN_MIGRATIONS_ON_BOOT=true`

### Worker container
- Dockerfile: `docker/Dockerfile.worker`
- Runs `dist/apps/api/worker-bootstrap.js`
- Dedicated for async jobs, sync processors, report generation, and future queue consumers.

### Web container
- Dockerfile: `docker/Dockerfile.web`
- Builds Next.js and serves production output on port `3001`.

### Data/runtime containers
- Postgres, Redis, and Ollama run as separate services.
- These boundaries allow independent scaling and restart isolation.

## Section 4 - Service architecture

### API service
- Handles synchronous client traffic.
- Owns request validation, auth, orchestration, and read APIs.

### Background worker service
- Handles asynchronous tasks.
- Intended workloads:
  - agent run execution
  - connector sync jobs
  - report generation
  - workflow escalation checks
  - delayed verification jobs

### AI reasoning service
- Logical role backed by Ollama.
- Can remain a separate runtime node even if invoked through the API/worker.

### Connector sync workers
- Best run in worker pool with queue jobs and checkpointed retries.

### Report generation workers
- Triggered after completed/verified runs or via scheduled summary jobs.

### Communication pattern
- HTTP for synchronous APIs.
- Queue dispatch for background jobs.
- Domain events for cross-module reactions.

## Section 5 - Queue architecture

Recommended queue topology:
- `agent-runs`
- `connector-sync`
- `workflow-escalations`
- `report-generation`
- `ai-analysis`

Queue rules:
- each job gets idempotency key
- retries with exponential backoff
- dead-letter handling after retry exhaustion
- worker metrics emitted for success/failure/latency

Recommended implementation next:
- BullMQ with Redis
- queue processors inside worker bootstrap context

## Section 6 - Database architecture

### Primary database
- PostgreSQL primary for writes.

### Read replicas
- Optional replicas for dashboard, reports, and analytics-heavy reads.

### Connection pooling
- Use PgBouncer or provider-native pooling in staging/production.
- Prisma should point to pooled endpoint for app traffic.

### Migration strategy
- Prisma migrations run in CI/CD or controlled boot gate.
- Production should prefer one-shot migration job over many replicas racing to migrate.

### Backups
- automated daily full backups
- PITR/WAL archiving where provider supports it
- restore rehearsal in staging

## Section 7 - Cache layer

Redis responsibilities:
- job queues
- rate limiting counters
- connector token caching
- short-lived AI/retrieval cache entries
- request burst smoothing and duplicate suppression

Redis should not be source of truth.

## Section 8 - File storage

Use S3-compatible object storage for:
- credential files
- exported CSV/PDF reports
- AI report attachments
- large evidence payloads

Environment strategy:
- local dev: MinIO or local mock
- staging/prod: managed S3-compatible provider

## Section 9 - AI runtime infrastructure

### Ollama placement
- separate runtime container/service
- `OLLAMA_BASE_URL` points API and workers to the model runtime

### Resource strategy
- CPU-only acceptable for development/demo
- GPU nodes recommended for production inference-heavy workloads
- keep Ollama isolated from API pods to prevent noisy-neighbor issues

### Scaling
- start with 1 dedicated inference node per environment
- scale horizontally by routing to multiple Ollama runtimes behind internal service discovery later

### Model caching
- persistent volume for `/root/.ollama`
- pre-pull `qwen2.5:7b-instruct` during environment provisioning for demo/staging

## Section 10 - CI/CD pipeline

Pipeline stages:
1. checkout
2. install dependencies
3. Prisma generate
4. backend build
5. seed type validation
6. build/push api, worker, web images
7. deploy to staging
8. run smoke tests against `/health`, `/health/readiness`, `/observability/summary`
9. promote to production

Versioning:
- image tags use commit SHA
- optional release tag for human-readable version

Rollback:
- redeploy previous known-good image tags
- keep schema backward compatible during rollout window

## Section 11 - Secrets management

Secrets to manage:
- database URLs
- JWT secrets
- connector secrets
- billing provider secrets
- object storage access keys

Recommended storage:
- local: `.env`
- staging/prod: secret manager or Kubernetes secrets backed by vault/KMS

Rotation strategy:
- version secrets
- dual-key rollout for JWT/connector secrets where possible
- periodic connector credential refresh

## Section 12 - Scaling strategy

### API
- horizontal replicas behind load balancer
- autoscale on CPU + latency + request rate

### Workers
- scale by queue depth and retry backlog

### AI runtime
- scale by inference latency and run backlog
- GPU pools for premium tenants or heavy executive/report workloads

### Database
- vertical scaling for primary
- read replicas for dashboards and reports

## Section 13 - Security architecture

- ingress or API gateway in front of web/API
- WAF for public traffic
- network segmentation:
  - web/public
  - api/app
  - worker/internal
  - data plane
- service-to-service auth via private networking and secret-based trust
- tenant-aware rate limiting and auth guards stay enforced at app layer

## Section 14 - Disaster recovery

- automated backups and restore drills
- failover strategy for Postgres via managed HA or orchestrated standby
- Redis persistence for queues when needed, with queue replay/idempotency at app layer
- deployment rollback by prior image tag
- Ollama node restart automation with persistent model cache volume

## Section 15 - Deployment topology

Recommended production topology:
- Load balancer / ingress
  - routes `/` to web cluster
  - routes `/api` to API cluster
- Web cluster
  - 2+ replicas
- API cluster
  - 2+ replicas
- Worker cluster
  - 1..N replicas depending on queue load
- AI runtime nodes
  - dedicated Ollama service, isolated compute
- PostgreSQL cluster
  - primary + optional read replicas + connection pooler
- Redis cluster
  - cache + queue coordination
- Object storage
  - report/document/artifact storage
- Monitoring stack
  - Prometheus, Grafana, log sink, Alertmanager

Traffic flow:
1. user -> load balancer -> web
2. web -> api
3. api -> postgres / redis / object storage / ollama
4. api -> queues for async jobs
5. workers -> queues -> postgres / redis / ollama / connectors

## Section 16 - Demo environment strategy

For 1 seeded org and ~500 records:
- deploy with `deploy/compose/development.yml`
- run Prisma migrations
- run seed
- optionally pre-seed demo connectors and observability alerts
- keep Ollama on CPU for customer demo environments unless GPU is available

Fast demo provisioning path:
- spin isolated Postgres + Redis + Ollama + API + web + worker stack
- assign trial tenant
- run `npm run db:seed`
- expose branded URLs for customer walkthroughs

## Section 17 - Infrastructure repository structure

### `docker/`
- application Dockerfiles and entrypoints

### `deploy/compose/`
- compose files for local/dev/staging

### `k8s/base/`
- baseline Kubernetes manifests for namespace, deployments, services, ingress

### `infra/env/`
- environment variable templates

### `scripts/`
- utility scripts for readiness waits and deployment helpers

### `.github/workflows/`
- CI/CD automation

## Section 18 - Production readiness checklist

- health endpoints verified
- observability endpoints verified
- backups configured and restore-tested
- Prisma migrations automated safely
- multi-tenant isolation verified
- secrets externalized
- API/web/worker images built reproducibly
- queue retry policy defined
- alert routing configured
- object storage configured
- rate limiting enabled
- demo provisioning path documented
