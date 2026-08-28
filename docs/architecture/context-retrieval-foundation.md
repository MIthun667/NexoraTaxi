# Context Retrieval Foundation

## Purpose of the Context Retrieval abstraction

The platform already has an existing retrieval module for agent-facing bundle assembly, but it did not yet expose a small, reusable, read-only context service for grounded operational entities. This step introduces that missing layer so future agents, insights, and recommendations can ask for structured context without jumping directly into domain-specific service logic.

The goal is not semantic search or ranking yet. The goal is a clean service boundary for retrieving trustworthy operational context from existing seeded data and established module read paths.

## Current related retrieval/context patterns found in the codebase

The current codebase already contains:

- `modules/retrieval`
  - provider-based retrieval orchestration for bundle assembly
  - shared history enrichment through domain events, approvals, and audit logs
- domain-level abstraction services
  - `PeopleService`
  - `AssetsService`
  - `OperationsService`
- workflow and approval detail reads
  - `ApprovalsService.getRequest(...)`
  - `WorkflowsService.getInstance(...)`

Those pieces made the existing retrieval module the cleanest place to extend rather than introducing a new parallel subsystem.

## Canonical RetrievedContext structure

The shared contract now lives under `apps/api/src/common/retrieval/`.

`RetrievedContext` includes:

- `contextId`
- `contextType`
- `contextCategory`
- `title`
- `summary`
- `sourceModule`
- `sourceEntityType`
- `sourceEntityId`
- `organizationId`
- `payload`
- `relatedContextIds`
- `collectedAt`
- `metadata`

This shape is intentionally small. It is designed for grounded operational summaries, not long-form reports or ranked search results.

## Initial module integrations used

The new `ContextRetrievalService` lives in `apps/api/src/modules/retrieval/context-retrieval.service.ts`.

It currently integrates with real existing modules only:

- `people`
  - `PeopleService.getPersonById(...)`
  - `PeopleService.listPeople(...)`
- `assets`
  - `AssetsService.getAssetById(...)`
  - `AssetsService.listAssets(...)`
- `operations`
  - `OperationsService.getOperationalTaskById(...)`
  - `OperationsService.listOperationalTasks(...)`
- `approvals`
  - `ApprovalsService.getRequest(...)`
  - `ApprovalsService.countPendingStepsForOrganization(...)`
- `workflows`
  - `WorkflowsService.getInstance(...)`
  - `WorkflowsService.findOverdueOpenTasksForOrganization(...)`

## Confirmation that existing seeded data sources are used

This foundation uses existing services that already read the platform’s seeded dataset.

That means:

- normalized seeded people data comes from `workforce` and `drivers` through `PeopleService`
- normalized seeded asset data comes from `fleet` through `AssetsService`
- normalized seeded operational task data comes from `dispatch` through `OperationsService`
- workflow and approval contexts use the real workflow and approval service reads already present in the codebase

No mock data, fake records, schema changes, or seed changes were introduced.

## What was safely introduced in this prompt

Added shared retrieval contracts:

- `common/retrieval/retrieved-context.interface.ts`
- `common/retrieval/retrieved-context-category.constants.ts`
- `common/retrieval/retrieved-context.util.ts`

Added service:

- `modules/retrieval/context-retrieval.service.ts`

Added safe pass-through methods on `RetrievalService`:

- `getEntityContext(...)`
- `getModuleContext(...)`
- `getRelatedOperationalContext(...)`

Updated `RetrievalModule` imports/exports so the new context service can compose existing read services safely.

## What was intentionally left unchanged

To preserve compatibility, this prompt intentionally did **not** change:

- existing retrieval bundle contracts
- provider orchestration behavior
- API routes
- Prisma schema
- seed files
- dashboard outputs
- intelligence runtime behavior
- semantic search / vector search
- signal-aware or recommendation-aware context ranking

## Recommended next step

The next safe step is to introduce a small internal context bundler that can combine:

- `RetrievedContext[]`
- `CanonicalSignal[]`
- `AgentInsight[]`

for one organization-scoped operational situation.

That will let dashboards, reports, and future agent flows share the same grounded read model before any ranking or LLM reasoning is introduced.
