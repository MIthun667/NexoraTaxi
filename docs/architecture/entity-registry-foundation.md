# Entity Registry Foundation

## Purpose of the Entity Registry

The platform already has several overlapping ways to refer to business entities:

- Prisma model names
- module-specific DTOs
- knowledge graph node types
- normalized read abstractions such as `Person`, `Asset`, and `OperationalTask`

The Entity Registry adds a small canonical identity layer above those sources so retrieval, aggregation, signals, insights, and future agents can refer to important business entities consistently without forcing schema changes or deep graph persistence.

## Current related patterns found in the codebase

The most relevant existing patterns were:

- `modules/knowledge-graph`
  - graph node typing and graph query composition
- normalized universal read abstractions
  - `people`
  - `assets`
  - `operations/tasks`
- workflow and approval read services
  - `WorkflowsService`
  - `ApprovalsService`

That made the existing knowledge-graph module the cleanest architectural home for the registry service.

## Canonical RegisteredEntity structure

The shared contract now lives under `apps/api/src/common/entities/`.

`RegisteredEntity` includes:

- `registryId`
- `entityType`
- `entityCategory`
- `entityId`
- `displayName`
- `sourceModule`
- `organizationId`
- `status`
- `metadata`
- `registeredAt`

This structure is intentionally small. It standardizes identity and labeling only. It does not yet model relationships, graph edges, lineage, or signal linkage.

## Entity types initially supported

The initial canonical types are grounded in modules and abstractions already present in the codebase:

- `person`
- `asset`
- `operational-task`
- `workflow-instance`
- `approval-request`

These align with the current universalization direction and existing normalized read surfaces.

## Initial module integrations used

The new `EntityRegistryService` lives in:

- `apps/api/src/modules/knowledge-graph/entity-registry.service.ts`

It uses real existing module services only:

- `PeopleService`
- `AssetsService`
- `OperationsService`
- `WorkflowsService`
- `ApprovalsService`

Additional safe read helpers were added to:

- `WorkflowsService.findInstancesForOrganization(...)`
- `ApprovalsService.findRequestsForOrganization(...)`

## Confirmation that existing seeded data sources are used where relevant

This foundation remains grounded in the real seeded dataset because it builds registered entity references from existing normalized or service-backed reads:

- seeded workforce + driver data via `PeopleService`
- seeded fleet-backed asset data via `AssetsService`
- seeded dispatch-backed operational task data via `OperationsService`
- real workflow and approval service reads where those records exist

No mock data, fake records, or new persistence models were introduced.

## What was safely introduced in this prompt

Added shared contracts:

- `common/entities/registered-entity.interface.ts`
- `common/entities/registered-entity-category.constants.ts`
- `common/entities/registered-entity-type.constants.ts`
- `common/entities/registered-entity.util.ts`

Added service:

- `modules/knowledge-graph/entity-registry.service.ts`

Updated module wiring:

- `KnowledgeGraphModule` now imports the normalized read modules and exports `EntityRegistryService`

Added small read-only helper methods:

- `WorkflowsService.findInstancesForOrganization(...)`
- `ApprovalsService.findRequestsForOrganization(...)`

## What was intentionally left unchanged

To preserve compatibility, this prompt intentionally did **not** change:

- Prisma schema
- route surface
- seed files
- graph query behavior
- graph edge modeling
- signal/entity linkage
- recommendation/entity linkage
- cross-module lineage logic

The registry currently standardizes canonical entity identity only.

## Recommended next step

The next safe step is to introduce lightweight entity relationship registration so the registry can express:

- person -> operational task
- asset -> operational task
- workflow instance -> approval request

as explicit registry-level links before any more advanced graph traversal or agent reasoning is added.
