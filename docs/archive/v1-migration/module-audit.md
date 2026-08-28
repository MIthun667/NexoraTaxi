# Module Audit

## Overview
This audit reviews every top-level module folder under `apps/api/src/modules` and classifies each module against the current target architecture: a universal AI Company Operating System with reusable enterprise, operational, AI, and infrastructure layers.

The codebase currently contains a mixed state:
- a substantial universal platform foundation already exists
- universal operational modules have been introduced alongside legacy taxi-domain modules
- several AI lifecycle and governance modules are already first-class
- some dashboard and intelligence surfaces still bridge both universal and taxi-era concepts

The goal of this document is not to refactor code yet. It is to make the current module landscape explicit, identify taxi-specific blockers, and clarify the next architectural cleanup priorities.

## Module Inventory

| Module | Category | Likely Responsibility |
|---|---|---|
| `actions` | AI / intelligence module | Executes approved or policy-allowed `AgentActionProposal` items through typed action handlers such as workforce, asset, operations, scheduling, incident, assignment, and notification actions. The presence of `action-execution`, `action-dispatcher`, `action-policy`, and handler files shows it is the controlled actuation layer between AI decisions and domain mutations. |
| `agents` | AI / intelligence module | Owns the agent runtime surface: agent registration, runs, policy, context assembly, reasoning, reusable skills, and verification. The nested `reasoning`, `skills`, and `verification` folders make this the orchestration core for the Trigger -> Retrieve -> Reason -> Decide -> Verify lifecycle. |
| `approvals` | Universal platform module | Manages approval requests, approval steps, queue queries, and step actions. This is a reusable human-in-the-loop governance module for any domain object, not just operational records. |
| `assets` | Operational core module | Implements the universal asset domain: asset CRUD, status updates, maintenance lifecycle, query filtering, policy checks, and presenters. It is the generalized replacement for taxi-specific fleet management. |
| `assignments` | Operational core module | Manages universal `ResourceAssignment` records, assignment conflict analysis, status transitions, list filtering, and lifecycle presenters. It generalizes workforce-to-shift, workforce-to-work-order, asset-to-work-order, and related operational allocation flows. |
| `audit` | Cross-cutting infrastructure module | Provides audit logging services shared across the platform. Its small footprint and service-only structure indicate that other modules depend on it for immutable trace recording. |
| `auth` | Universal platform module | Handles authentication concerns such as login, JWT guards, token issuance, refresh tokens, and password handling. This is part of the core enterprise control plane. |
| `authz` | Universal platform module | Provides RBAC authorization behavior through an `rbac.service` and controller surface. It complements `auth` by governing what authenticated actors can do. |
| `dashboard` | Cross-cutting infrastructure module | Aggregates summary, alerts, and trend endpoints across workforce, dispatch/operations, incidents, and workflows for UI dashboards. It is a read-model/composition layer rather than a source-of-truth business domain. |
| `dispatch` | Taxi-specific module | Implements taxi-era dispatch concepts such as dispatch zones, shifts, runs, incidents, and driver-vehicle assignments. Its DTO set is tightly coupled to dispatch nouns rather than universal operational abstractions. |
| `drivers` | Taxi-specific module | Owns taxi-driver CRUD, driver documents, and driver status updates. It encodes a specific labor subtype as a first-class domain instead of using the universal workforce model. |
| `events` | Cross-cutting infrastructure module | Provides shared domain-event constants and types. It acts as a thin contract layer for event-driven components across the platform. |
| `fleet` | Taxi-specific module | Manages fleet vehicles, fleet status, and maintenance records using taxi/logistics-specific language. It overlaps directly with the newer universal `assets` module and is a legacy bounded context. |
| `governance` | AI / intelligence module | Tracks AI observability, policy monitoring, health, execution metrics, operational impact, and audit traces. It is the enterprise AI governance and trust layer rather than a business operations domain. |
| `health` | Cross-cutting infrastructure module | Exposes liveness/readiness and component-specific health endpoints such as database, AI runtime, and connectors. This is an infrastructure reliability module. |
| `incidents` | Operational core module | Manages universal operational incidents and incident actions. Its DTOs and service surface show a generalized incident model suitable across industries, not just taxi dispatch incidents. |
| `integrations` | Cross-cutting infrastructure module | Provides the external connector framework for email, Slack, calendar, CRM, helpdesk, IoT, and webhook integrations. It also includes connector auth, sync, action execution, and webhook ingestion services. |
| `intelligence` | AI / intelligence module | Provides LLM-facing inference utilities, prompt templates, structured inference schemas, and operational summarization services. Several files still reference legacy taxi concepts, but the module’s role is broad AI inference support. |
| `knowledge-graph` | AI / intelligence module | Builds and queries the operational knowledge graph projection used to enrich retrieval and multi-hop reasoning. The builder, updater, analytics, and query services show it is a graph-context layer over relational operational data. |
| `notifications` | Universal platform module | Manages notification delivery and domain event publication/handling. This is a reusable enterprise messaging layer used by workflows, approvals, actions, and governance. |
| `observability` | Cross-cutting infrastructure module | Provides platform-level structured logging, metrics, tracing, alerting, reliability incident monitoring, and observability summary endpoints. It is infrastructure-wide rather than domain-specific. |
| `operations` | Operational core module | Implements universal operational zones and work orders, including lifecycle status changes, queries, policies, presenters, and repositories. It is the generalized successor to dispatch-run style work execution. |
| `platform` | Universal platform module | Groups core enterprise structure modules for organizations, departments, positions, and employees. This is the canonical system-of-record layer for enterprise structure and workforce identity anchors. |
| `reports` | AI / intelligence module | Generates persisted AI decision reports from agent runs, evidence, risk analysis, and templates. It turns AI decisioning into explainable artifacts for leadership, operators, and approval flows. |
| `retrieval` | AI / intelligence module | Orchestrates bounded context retrieval for agents from workforce, assets, operations, scheduling, incidents, assignments, and the knowledge graph. It is the structured evidence-gathering layer before reasoning. |
| `scheduling` | Operational core module | Implements universal schedule plans and schedule shifts, including capacity management, shift status transitions, and query surfaces. It generalizes taxi dispatch scheduling into a reusable operational scheduling domain. |
| `tenancy` | Cross-cutting infrastructure module | Handles multi-tenant SaaS concerns such as provisioning, subscriptions, billing events, usage metering, plan enforcement, and tenant guards. It is a platform infrastructure boundary for organization isolation and commercialization. |
| `triggers` | AI / intelligence module | Contains the automation trigger engine for evaluating rules on domain events and dispatching actions such as workflow starts, approvals, notifications, or agent runs. It is the policy-aware event-to-automation bridge. |
| `workflows` | Universal platform module | Manages workflow definitions, instances, tasks, and task actions. This is a reusable enterprise process orchestration engine used across many domains. |
| `workforce` | Operational core module | Implements the universal workforce model, including workforce members, credentials, status history, query services, policies, and presenters. It is the generalized replacement for driver-specific workforce handling. |

## Category Classification

### Universal platform modules
- `approvals`
- `auth`
- `authz`
- `notifications`
- `platform`
- `workflows`

These modules define reusable enterprise control-plane capabilities: identity, authorization, organizational structure, approvals, workflows, and notifications.

### Operational core modules
- `assets`
- `assignments`
- `incidents`
- `operations`
- `scheduling`
- `workforce`

These modules form the generalized execution layer of the platform: people, assets, work, schedules, incidents, and operational allocations.

### Taxi-specific modules
- `dispatch`
- `drivers`
- `fleet`

These modules preserve the original taxi/logistics-specific bounded contexts and remain the clearest blockers to a clean universal model.

### AI / intelligence modules
- `actions`
- `agents`
- `governance`
- `intelligence`
- `knowledge-graph`
- `reports`
- `retrieval`
- `triggers`

These modules implement the AI lifecycle from trigger and retrieval through reasoning, action execution, governance, graph context, and explainable reporting.

### Cross-cutting infrastructure modules
- `audit`
- `dashboard`
- `events`
- `health`
- `integrations`
- `observability`
- `tenancy`

These modules support platform operations, read models, reliability, integrations, tenancy, and shared event contracts across multiple business domains.

## Taxi-Specific Concepts

| Taxi-specific concept | Where it appears | Why it blocks universalization |
|---|---|---|
| `Driver` | `drivers`, `dispatch`, `dashboard`, parts of `intelligence` | Encodes one operational worker subtype as a primary entity, which prevents broader support for contractors, technicians, operators, clinicians, guards, and other workforce roles. |
| `DriverDocument` / driver compliance | `drivers`, `intelligence` | Compliance artifacts are modeled specifically around drivers instead of general workforce credentials such as licenses, certifications, training records, and permits. |
| `DriverStatusHistory` / driver status flows | `drivers` | Status transitions are tied to drivers instead of a generalized workforce status history model. |
| `FleetVehicle` / fleet vehicle CRUD | `fleet`, `dashboard`, `intelligence` | Vehicles are treated as the only meaningful operational asset, blocking equipment, tools, devices, facilities, and machines as first-class assets. |
| `FleetMaintenanceRecord` | `fleet`, `dashboard`, `intelligence` | Maintenance logic is vehicle-centric rather than asset-centric. |
| `DispatchZone` | `dispatch`, `dashboard` | Dispatch terminology limits the zone model to a taxi/logistics framing rather than a reusable operational territory or coverage area. |
| `DispatchShift` | `dispatch`, `dashboard` | Shift logic exists in a dispatch-specific context instead of the universal scheduling domain. |
| `DispatchRun` | `dispatch`, `dashboard`, `intelligence` | Represents work execution in a taxi-centric noun rather than a generalized work order / operational run abstraction. |
| `DriverVehicleAssignment` | `dispatch` | Hardcodes a specific worker-to-vehicle pairing model instead of a universal resource assignment pattern. |
| `DispatchIncident` | `dispatch`, `dashboard`, `intelligence` | Incident handling is framed around dispatch operations rather than a generalized operational incident model. |
| Taxi-specific AI prompt/schema concepts | `intelligence` (`generate-driver-compliance-explanation`, `generate-fleet-readiness-explanation`, `generate-dispatch-incident-summary`) | AI services still expose legacy entity vocabulary, which keeps the intelligence layer partially coupled to taxi workflows. |
| Taxi-specific dashboard naming and trend endpoints | `dashboard` (`dispatch-summary`, `trends/dispatch`) | Read models and UI composition still expose dispatch-era mental models alongside universal operations. |

## Universal Abstraction Mapping

| Taxi-specific concept | Closest universal abstraction | Primary target module |
|---|---|---|
| `drivers` | `workforce` / `WorkforceMember` | `workforce` |
| `driver documents` | `credential documents` / workforce compliance artifacts | `workforce` |
| `driver status` | workforce operational / availability / compliance status | `workforce` |
| `fleet` | `assets` / `Asset` | `assets` |
| `fleet maintenance` | asset maintenance / asset service records | `assets` |
| `dispatch zones` | `operations` / `OperationalZone` | `operations` |
| `dispatch shifts` | `scheduling` / `ScheduleShift` | `scheduling` |
| `dispatch runs` | `operations` / `WorkOrder` | `operations` |
| `driver vehicle assignments` | `assignments` / `ResourceAssignment` | `assignments` |
| `dispatch incidents` | `incidents` / `OperationalIncident` | `incidents` |
| dispatch analytics | operations + scheduling + assignments + incidents read models | `dashboard` |
| driver/fleet/dispatch AI summaries | universal workforce/asset/operations/incident reasoning skills | `intelligence`, `agents`, `skills` |

## Risks to Generalization

| Risk | Why it matters | Modules most affected |
|---|---|---|
| Parallel legacy and universal domains | The platform now has both universal modules and taxi-specific modules for similar responsibilities, which can create duplicated APIs, duplicated write paths, and inconsistent data ownership. | `drivers`, `fleet`, `dispatch`, `workforce`, `assets`, `operations`, `scheduling`, `assignments`, `incidents` |
| Dashboard coupling to legacy concepts | Dashboard endpoints still expose dispatch-era and workforce-era mixed summaries, increasing front-end and reporting complexity. | `dashboard` |
| Intelligence layer still references taxi nouns | AI prompts and schemas tied to driver/fleet/dispatch vocabulary make it harder to reuse intelligence across industries. | `intelligence` |
| Legacy DTO/API surface may still be the frontend contract | Even if universal modules exist, existing clients may still depend on taxi DTOs and route shapes, slowing migration. | `drivers`, `fleet`, `dispatch`, `dashboard` |
| Knowledge graph and retrieval may inherit mixed semantics | If graph edges and retrieval providers consume both universal and legacy nouns, agents may reason over inconsistent models. | `knowledge-graph`, `retrieval`, `agents` |
| Operational ownership boundaries are still settling | `operations`, `scheduling`, and `assignments` are now distinct universal modules, but older dispatch flows may still overlap with them conceptually. | `dispatch`, `operations`, `scheduling`, `assignments` |
| Commercialization and tenancy layers depend on a stable domain vocabulary | Packaging plans, features, analytics, and usage limits becomes harder if the core product still exposes taxi-era product language. | `tenancy`, `governance`, `reports`, frontend dashboards that consume dashboard APIs |

## Recommended Next Refactor Priorities

1. **Freeze taxi-specific modules as legacy compatibility surfaces**
   Treat `drivers`, `fleet`, and `dispatch` as compatibility modules only, with universal modules becoming the target source of truth for new work.

2. **Audit and migrate dashboard read models to universal terminology**
   Replace `dispatch`-named summaries and trend endpoints with `operations`, `scheduling`, `assignments`, `incidents`, `assets`, and `workforce` aligned read models.

3. **De-taxi the intelligence module**
   Rename or supersede taxi-specific inference DTOs, prompt templates, and schemas so the AI layer speaks in universal enterprise-operational nouns.

4. **Define explicit ownership boundaries between universal operational modules**
   Document and enforce which module owns work execution (`operations`), scheduling (`scheduling`), resource allocation (`assignments`), incidents (`incidents`), workforce (`workforce`), and assets (`assets`).

5. **Introduce migration adapters instead of mixed domain logic**
   Where legacy APIs must remain temporarily, use adapters/mappers that translate universal entities into old taxi-shaped responses rather than preserving duplicate business rules.

6. **Standardize event and report vocabulary around universal abstractions**
   Ensure domain events, retrieval bundles, decision reports, knowledge graph nodes, and governance metrics consistently reference universal entity types.

7. **Plan staged deprecation for taxi-specific modules**
   Establish a documented sequence for deprecating `drivers`, `fleet`, and `dispatch` once universal equivalents fully cover CRUD, lifecycle flows, dashboards, integrations, and AI usage.
