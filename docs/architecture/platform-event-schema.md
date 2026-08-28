# Platform Event Schema

## Purpose of the canonical event schema
The platform already has a working domain-event system, but event naming and payload semantics are in a mixed state. Some modules already publish universal event names such as `work_order.created` and `asset.status.changed`, while legacy taxi-era concepts still appear through prefixes like `operator.*` and through payload fields like `driverId` and `vehicleId`.

A canonical event schema gives the platform a stable, shared event vocabulary that can support both:
- existing legacy/taxi-era event publishers and consumers
- new universal enterprise abstractions such as people, assets, operations, assignments, schedules, and incidents

This prompt introduces shared event normalization scaffolding only. It does **not** rename existing live event types or break existing event consumers.

## Current event patterns found in the codebase

### Current publishing pattern
The current event system is centered on:
- `apps/api/src/modules/notifications/domain-events.service.ts`
- `apps/api/src/modules/events/domain-events.types.ts`
- `apps/api/src/modules/notifications/event-handlers.service.ts`

Observed behavior:
- publishers call `DomainEventsService.publish(...)`
- events are persisted as `domainEvent` rows
- events are handled immediately by `EventHandlersService`
- triggers are dispatched from `EventHandlersService`
- event types are plain strings rather than a single global enum

### Current event naming shape
Current event names in active use include:

| Event namespace | Examples | Status |
|---|---|---|
| `approval.*` | `approval.request.created`, `approval.step.assigned` | already platform-grade |
| `workflow.*` | `workflow.task.assigned`, `workflow.task.action.recorded` | already platform-grade |
| `asset.*` | `asset.status.changed`, `asset.compliance.alert` | already close to universal |
| `operations.*` | `operations.assignment.created`, `operations.issue.opened` | transitional but acceptable |
| `work_order.*` | `work_order.created`, `work_order.status_changed` | already universal |
| `operational_zone.*` | `operational_zone.created` | already universal |
| `resource_assignment.*` | `resource_assignment.created`, `resource_assignment.released` | already universal |
| `schedule_*` | `schedule_shift.created`, `schedule_shift.understaffed` | already universal |
| `workforce_*` / `credential_*` | `workforce_member.created`, `credential_document.verified` | already universal |
| `operator.*` | `operator.status.changed`, `operator.compliance.alert` | legacy/transitional taxi-era vocabulary |
| `driver.*` | recognized by handlers, but not a dominant active producer | legacy taxi-era vocabulary |
| `fleet.*` | recognized by handlers, but active fleet service mostly publishes `asset.*` | legacy taxi-era vocabulary |
| `dispatch.*` | recognized by handlers, while active dispatch service mostly publishes `operations.*` | legacy taxi-era vocabulary |
| `trigger.*` | `trigger.execution.succeeded` | infrastructure/intelligence namespace |

### Current payload pattern
Current payloads are flexible JSON objects shaped as `DomainEventPayload`, often containing:
- `notification`
- `recipients`
- event-specific fields such as:
  - `driverId`
  - `vehicleId`
  - `workforceMemberId`
  - `assetId`
  - `workOrderId`

This means payload structure is already extensible, but it is not yet normalized around one universal event vocabulary.

## Canonical event structure
A shared canonical contract was introduced under:
- `apps/api/src/common/events/canonical-event.interface.ts`
- `apps/api/src/common/events/event-category.constants.ts`
- `apps/api/src/common/events/event-name-map.ts`
- `apps/api/src/common/events/event-normalization.util.ts`

Canonical platform event shape:

| Field | Meaning |
|---|---|
| `eventId` | persisted event identifier if available |
| `eventType` | original event type exactly as published today |
| `canonicalEventType` | preferred normalized universal event name |
| `eventCategory` | high-level business category |
| `occurredAt` | event timestamp |
| `organizationId` | tenant/organization boundary |
| `sourceModule` | module that emitted the event |
| `entityType` | normalized universal entity type |
| `entityId` | entity identifier if available |
| `actorType` | actor kind if available |
| `actorId` | actor identifier if available |
| `payload` | original event payload |
| `metadata` | event metadata |
| `legacyEventType` | legacy alias when normalization occurred |

Important compatibility rule:
- `eventType` is **not changed**
- the canonical schema is layered on top through normalization and metadata enrichment

## Event category definitions
Only categories supported by the current architecture direction were introduced.

| Category | Meaning |
|---|---|
| `people` | workforce, operators, driver-like human operational actors |
| `assets` | vehicles, equipment, devices, asset maintenance, readiness |
| `operations` | work orders, operational tasks, operational zones, assignments, schedules, incidents |
| `workflows` | workflow definitions, tasks, and progression events |
| `approvals` | approval requests, steps, and decisions |
| `notifications` | user-facing delivery events and notification-related events |
| `intelligence` | triggers, agent/report/intelligence-adjacent events |
| `system` | fallback category for uncategorized platform events |

## Legacy taxi-era event vocabulary mappings
The shared mapping registry codifies the legacy-to-universal translation without breaking live publishers.

| Legacy prefix | Canonical prefix | Category | Notes |
|---|---|---|---|
| `driver.` | `people.` | `people` | legacy taxi-era driver namespace |
| `operator.` | `people.` | `people` | current transitional taxi-era operator namespace |
| `fleet.` | `assets.` | `assets` | legacy fleet namespace |
| `dispatch.` | `operations.` | `operations` | legacy dispatch namespace |

Entity type normalization rules introduced:

| Legacy aggregate/entity type | Canonical entity type |
|---|---|
| `driver` | `person` |
| `operator` | `person` |
| `workforce_member` / `workforce-member` | `person` |
| `fleet` / `vehicle` / `fleet-vehicle` | `asset` |
| `dispatch` / `dispatch-run` | `operational-task` |
| `dispatch-issue` | `incident` |
| `resource-assignment` | `assignment` |
| `work_order` / `work-order` | `operational-task` |

## What was safely introduced in this prompt
The following changes were made safely and without breaking current event behavior.

### Shared code additions
Added a new shared event normalization layer under `apps/api/src/common/events`.

### Metadata enrichment in `DomainEventsService`
`DomainEventsService.publish(...)` now enriches persisted event metadata with:
- `canonicalEventType`
- `eventCategory`
- `canonicalEntityType`
- `legacyEventType`

This preserves the original `eventType` while making canonical event information available to future consumers.

### Safe adoption in `EventHandlersService`
`EventHandlersService` now computes normalized event names for logging and diagnostics only. The prefix-based routing logic remains unchanged.

### Explicit migration TODO markers
Focused TODO comments were added in:
- `drivers.service.ts`
- `fleet.service.ts`
- `dispatch.service.ts`
- `event-handlers.service.ts`

These mark the remaining taxi-era event vocabulary and payload semantics that should be migrated later.

## What was intentionally left unchanged
To preserve compatibility, this prompt intentionally did **not** change:
- persisted schema
- existing `eventType` values
- existing event publisher call sites broadly
- existing event consumer routing behavior
- existing trigger matching behavior
- existing notification behavior
- existing routes or DTO contracts

This keeps the event system production-safe while creating a canonical normalization path for future prompts.

## Recommended next migration step
1. Start publishing canonical universal event names directly from new universal modules while keeping legacy aliases where needed.
2. Add canonical-event-aware trigger matching so trigger rules can bind to universal categories without depending on taxi-era names.
3. Normalize payload fields in legacy modules:
   - `driverId` -> `personId` / `workforceMemberId`
   - `vehicleId` -> `assetId`
4. Refactor `EventHandlersService` to route by canonical category instead of legacy string-prefix checks.
5. Introduce canonical event constants for remaining legacy modules once frontend and downstream consumers are ready.
