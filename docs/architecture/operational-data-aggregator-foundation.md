# Operational Data Aggregator Foundation

## Purpose of the Operational Data Aggregator

The platform already has normalized read models for people, assets, and operational tasks, plus a retrieval foundation for collecting entity and module context. The missing layer was a small cross-module aggregator that can assemble those grounded reads into one structured operational view.

This aggregator is intentionally simple. It is not a graph traversal engine, search engine, ranking system, or agent runtime. It is a read-only composition layer for future signals, insights, recommendations, reports, and agent workflows.

## Current related patterns found in the codebase

The closest existing patterns were:

- `modules/retrieval`
  - provider orchestration for retrieval bundles
  - shared history assembly
  - newly added `ContextRetrievalService`
- normalized abstraction modules
  - `PeopleService`
  - `AssetsService`
  - `OperationsService`
- workflow/approval read services
  - `WorkflowsService`
  - `ApprovalsService`

That made the retrieval module the cleanest place to extend without adding another orchestration subsystem.

## Canonical OperationalAggregate structure

The shared aggregate contract now lives under `apps/api/src/common/aggregation/`.

`OperationalAggregate` includes:

- `aggregateId`
- `aggregateType`
- `aggregateCategory`
- `title`
- `summary`
- `organizationId`
- `primaryEntityType`
- `primaryEntityId`
- `people`
- `assets`
- `operationalTasks`
- `workflows`
- `approvals`
- `signals`
- `metadata`
- `assembledAt`

The aggregate keeps sections separate so future consumers can reason about the assembled view without losing source boundaries.

## Initial module integrations used

The new `OperationalDataAggregatorService` lives in:

- `apps/api/src/modules/retrieval/operational-data-aggregator.service.ts`

It uses real existing read services only:

- `ContextRetrievalService`
  - person context
  - asset context
  - operational task context
  - workflow instance context
  - module summaries for people/assets/operations/approvals/workflows

No direct Prisma access was introduced in the aggregator layer.

## Confirmation that existing seeded data sources are used

This foundation remains grounded in the seeded operational dataset because the aggregator composes only existing real module reads:

- people data from `workforce` and `drivers` through `PeopleService`
- asset data from `fleet` through `AssetsService`
- operational task data from `dispatch` through `OperationsService`
- workflow and approval context from the current workflow/approval services

No mock data, fake records, or synthetic aggregates were introduced.

## What was safely introduced in this prompt

Added shared contracts:

- `common/aggregation/operational-aggregate.interface.ts`
- `common/aggregation/operational-aggregate-category.constants.ts`
- `common/aggregation/operational-aggregate.util.ts`

Added service:

- `modules/retrieval/operational-data-aggregator.service.ts`

Added safe pass-through methods on `RetrievalService`:

- `aggregateForEntity(...)`
- `aggregateForOperationalTask(...)`
- `aggregateForWorkflow(...)`

Updated `RetrievalModule` exports so the aggregator can be reused elsewhere later.

## What was intentionally left unchanged

To preserve compatibility, this prompt intentionally did **not** change:

- retrieval bundle provider behavior
- dashboard APIs
- intelligence runtime behavior
- signal orchestration
- recommendation orchestration
- Prisma schema
- seed files
- route surface

The `signals` field exists on the aggregate shape, but this step intentionally leaves it empty until signal-aware aggregation is introduced in a controlled follow-up.

## Recommended next step

The next safe step is to add a small signal-aware aggregation pass that can enrich `OperationalAggregate` with canonical signals from the existing anomaly detectors.

That would let one aggregate carry:

- normalized entity context
- related module context
- canonical operational signals

without yet introducing ranking, recommendation generation, or full agent orchestration.
