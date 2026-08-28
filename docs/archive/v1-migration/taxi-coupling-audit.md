# Taxi Coupling Audit

## Purpose
This document identifies where taxi-specific architecture is still structurally coupled into the backend through API routes, Prisma model ownership, module boundaries, and backend-facing contracts.

The purpose is to make the remaining legacy surface explicit before refactoring. It is meant to guide future prompts that migrate the platform from a mixed taxi + universal design into a clean universal AI Company Operating System.

This audit is based on:
- `apps/api/src/modules`
- `prisma/schema.prisma`
- [module-audit.md](/home/mithon-hossain/projects/AI_CEO/docs/architecture/module-audit.md)
- [universal-entity-mapping.md](/home/mithon-hossain/projects/AI_CEO/docs/architecture/universal-entity-mapping.md)

## Route Surface Audit

### Taxi-specific controllers and endpoints

| Module | Controller base | Taxi-specific routes exposed | Notes |
|---|---|---|---|
| `drivers` | `@Controller(['operators', 'drivers'])` | `GET/POST/PATCH/DELETE /drivers`, `:id/documents`, `:id/status`, `:id/status-history` | Exposes both `operators` and `drivers`, but DTOs and controller naming remain driver-centric. |
| `fleet` | `@Controller(['assets', 'fleet'])` | `POST/GET/PATCH/DELETE /fleet/vehicles`, `vehicles/:id/maintenance-records`, `vehicles/:id/status`, `vehicles/:id/status-history` | Shares the `assets` namespace while still exposing vehicle-only routes and fleet nouns. This creates namespace ambiguity with universal `assets`. |
| `dispatch` | `@Controller(['operations', 'dispatch'])` | `zones`, `shifts`, `assignments`, `runs`, `incidents`, `assignments/:id/release` under both `operations/*` and `dispatch/*` | This is the highest-risk overlap: universal-sounding `operations/*` routes currently back taxi-specific dispatch semantics. |

### Universal operational controllers with overlapping purpose

| Module | Controller base | Universal routes exposed | Overlap with taxi-specific modules |
|---|---|---|---|
| `workforce` | `@Controller('workforce')` | `/workforce`, `/workforce/:id/credentials`, `/workforce/:id/status`, `/workforce/:id/history` | Overlaps with `drivers` document/status/profile flows. |
| `assets` | `@Controller('assets')` | `/assets`, `/assets/:id/maintenance`, `/assets/:id/status`, `/assets/:id/history` | Overlaps with `fleet` vehicle, maintenance, and status flows. |
| `operations` | `@Controller('operations/zones')`, `@Controller('operations/work-orders')`, plus legacy no-prefix controller entries for `work-orders` | `/operations/zones`, `/operations/work-orders`, `/work-orders`, `/work-orders/:id/status` | Overlaps conceptually with `dispatch` zones and runs. |
| `scheduling` | `@Controller('scheduling/plans')`, `@Controller('scheduling/shifts')`, plus legacy no-prefix controller entries for `schedule-plans` and `schedule-shifts` | plans, shifts, publish, status, capacity | Overlaps with `dispatch` shifts. |
| `assignments` | `@Controller('assignments')` | `/assignments`, `/:id/status`, `/:id/release`, `validate-conflicts` | Overlaps with `dispatch` assignments and release flow. |
| `incidents` | module exists but does not currently expose a dispatch alias in the inspected set | universal incident handling | Overlaps with `dispatch/incidents` semantics. |

### Dashboard route aliases that still expose taxi vocabulary

| Route | Current shape | Risk |
|---|---|---|
| `/dashboard/drivers-summary` | alias of operators/drivers summary | Frontend/API consumers still see `drivers` as a first-class business surface. |
| `/dashboard/fleet-summary` | alias of asset/fleet summary | Preserves vehicle-only mental model for assets. |
| `/dashboard/dispatch-summary` | alias of operations/dispatch summary | Keeps dispatch as the dominant work execution noun. |
| `/dashboard/trends/dispatch` | alias of operations trend route | Bakes taxi-specific naming into charts and trend contracts. |
| `/dashboard/operators-summary` | partial abstraction attempt | Suggests vocabulary drift: `operators`, `drivers`, and `workforce` coexist. |

### Route naming patterns that are problematic for a universal Company OS

| Pattern | Why it is risky |
|---|---|
| One controller exposing both universal and taxi aliases | Makes it unclear which route is canonical and slows deprecation. |
| Taxi-specific nouns mounted under universal prefixes | Example: `dispatch` controller mounted under `operations`; this makes API shape look universal while persistence and DTO semantics remain taxi-specific. |
| Parallel route families for the same capability | Example: `drivers` vs `workforce`, `fleet` vs `assets`, `dispatch/shifts` vs `scheduling/shifts`. This creates duplicate frontend contracts. |

## Prisma Model Ownership Audit

### Taxi-specific Prisma models and likely future ownership

| Prisma model | Current taxi-specific ownership | Current module surface | Closest universal ownership target |
|---|---|---|---|
| `Driver` | Taxi workforce/operator record | `drivers`, `dispatch`, `dashboard`, `intelligence`, `agents` | `workforce` |
| `DriverDocument` | Driver-only compliance/document storage | `drivers`, `intelligence` | `workforce` (`CredentialDocument`) |
| `DriverStatusHistory` | Driver lifecycle/status tracking | `drivers` | `workforce` (`WorkforceStatusHistory`) |
| `FleetVehicle` | Taxi vehicle asset | `fleet`, `dashboard`, `intelligence`, `agents` | `assets` (`Asset`) |
| `FleetMaintenanceRecord` | Vehicle maintenance history | `fleet`, `dashboard`, `intelligence` | `assets` (`AssetMaintenanceRecord`) |
| `FleetStatusHistory` | Vehicle readiness/compliance/status history | `fleet` | `assets` (`AssetStatusHistory`) |
| `DispatchZone` | Taxi dispatch geography/territory | `dispatch`, `dashboard` | `operations` (`OperationalZone`) |
| `DispatchShift` | Taxi shift construct | `dispatch`, `dashboard` | `scheduling` (`ScheduleShift`) |
| `DriverVehicleAssignment` | Taxi operator-to-vehicle/run allocation | `dispatch`, `dashboard`, `agents`, `intelligence` | `assignments` (`ResourceAssignment`) |
| `DispatchRun` | Taxi work execution record | `dispatch`, `dashboard`, `intelligence`, `agents` | `operations` (`WorkOrder`) |
| `DispatchIncident` | Taxi-specific operational incident | `dispatch`, `dashboard`, `intelligence`, `agents` | `incidents` (`OperationalIncident`) |

### Universal or already-generalized Prisma models

| Prisma model | Current owner / dominant module | Notes |
|---|---|---|
| `WorkforceMember` | `workforce` | Generalized successor to `Driver`. |
| `CredentialDocument` | `workforce` | Generalized successor to `DriverDocument`. |
| `WorkforceStatusHistory` | `workforce` | Generalized successor to driver status history. |
| `Asset` | `assets` | Generalized successor to `FleetVehicle`. |
| `AssetMaintenanceRecord` | `assets` | Generalized successor to vehicle maintenance records. |
| `AssetStatusHistory` | `assets` | Generalized successor to fleet status history. |
| `OperationalZone` | `operations` | Generalized successor to `DispatchZone`. |
| `WorkOrder` | `operations` | Generalized successor to `DispatchRun`. |
| `SchedulePlan` / `ScheduleShift` | `scheduling` | Generalized successor to dispatch scheduling constructs. |
| `OperationalIncident` | `incidents` | Generalized successor to `DispatchIncident`. |
| `ResourceAssignment` | `assignments` | Generalized successor to driver/vehicle/shift assignment flows. |

### Persistence-boundary observations

| Observation | Why it matters |
|---|---|
| Taxi-specific and universal models coexist in the same schema | This is acceptable during migration, but it means read models and AI modules can accidentally mix old and new sources of truth. |
| Some read/composition modules still query taxi-specific Prisma models directly | `dashboard`, `intelligence`, and parts of `agents` still pull from legacy models instead of universal replacements. |
| Universal ownership is already structurally clear in most new modules | The next issue is not “what should own the data,” but removing lingering reads/writes against legacy models. |

## Module Coupling Audit

### Strong taxi-specific coupling points

| Module | Coupling point | Evidence | Risk |
|---|---|---|---|
| `dashboard` | Direct dependency on taxi-specific Prisma enums and tables | Uses `DispatchIncident*`, `DispatchRunStatus`, `Driver*`, `Fleet*`; queries `driver`, `fleetVehicle`, `dispatchRun`, `dispatchIncident`, `driverVehicleAssignment`, `dispatchZone`, raw SQL on dispatch tables | Highest read-model coupling. Keeps taxi nouns alive in overview, alerts, and trends. |
| `intelligence` | Taxi-specific DTOs, schemas, prompt templates, and Prisma queries | `generate-dispatch-incident-summary`, `generate-driver-compliance-explanation`, `generate-fleet-readiness-explanation`; prompt templates include `moduleKey: 'dispatch'`, `moduleKey: 'drivers'`, `moduleKey: 'fleet'` | AI inference layer is still partially taxi-bounded. |
| `agents` | Agent registry, context building, and execution still contain taxi-specific agents and entity types | `dispatch-risk-agent`, `driver-oversight-agent`, `fleet-compliance-agent`; `agent-context.service` builds contexts from `dispatchIncident`, `driver`, `fleetVehicle`; `agent-runner.service` executes taxi-specific agent branches | AI runtime still has explicit legacy agent identities and payload contracts. |
| `dispatch` | Mounted under universal route alias `operations` | `@Controller(['operations', 'dispatch'])` | Makes the API surface appear universal while the domain model remains taxi-specific. |
| `fleet` | Mounted under universal route alias `assets` | `@Controller(['assets', 'fleet'])` | Blurs canonical ownership between legacy and universal asset APIs. |
| `drivers` | Mounted under alias `operators` while remaining driver-based | `@Controller(['operators', 'drivers'])` | Suggests abstraction progress, but DTOs and persistence remain taxi-specific. |

### Medium coupling points

| Module | Coupling point | Evidence | Risk |
|---|---|---|---|
| `reports` | No strong direct taxi-specific coupling observed in the current module surface | Report generation is tied to agent runs and evidence, not directly to taxi DTO names in the inspected files | Lower risk today, but report content quality still depends on taxi-coupled agent/intelligence inputs. |
| `triggers` | Generic trigger infrastructure, but downstream actions can still target taxi-era event types if emitted elsewhere | Trigger engine itself is neutral; risk is inherited from event producers | Medium indirect risk. |
| `workflows` | Generic workflow engine without obvious taxi-specific DTOs | Routes and service surface are workflow-neutral | Low direct risk; may still orchestrate taxi entities via `entityType` values outside this module. |
| `retrieval` | Retrieval providers are universal, but agent/runtime consumers still include taxi-specific contexts | The retrieval module itself is mostly clean; mixed semantics can still arrive via `agents` and graph contexts | Medium indirect risk. |
| `knowledge-graph` | Graph projection is universal-leaning, but graph consumers can still ask taxi-specific questions | Internal capability is reusable; risk depends on upstream entity vocabulary and event sources | Medium indirect risk. |

### Import/dependency pattern observations

| Pattern | Impact |
|---|---|
| Legacy modules are not heavily imported directly by universal operational modules | Good sign: the newer universal modules mostly own their own logic cleanly. |
| Taxi coupling is concentrated in composition/orchestration layers | The biggest risks sit in `dashboard`, `intelligence`, and `agents`, not in `workforce`, `assets`, `operations`, `scheduling`, `assignments`, or `incidents`. |
| Event, trigger, and workflow infrastructure is mostly vocabulary-neutral | This makes future refactoring easier because the structural engine can remain stable while domain nouns are normalized. |

### Circular or risky boundary patterns

| Pattern | Why it is risky |
|---|---|
| Multiple controller surfaces for the same business capability | Creates route ambiguity and slows deprecation. |
| Legacy domains mounted under universal route aliases | Increases risk that frontend and third-party clients couple to the wrong module. |
| Taxi-specific AI agent definitions hardcoded in runtime services | Makes the AI control plane partially industry-bound even after universal domains exist. |
| Dashboard and intelligence directly querying legacy tables | Keeps old persistence models alive in the most visible product surfaces. |

## Frontend Contract Risk
This section is backend-contract-driven: it identifies DTOs, route names, and event/prompt names that likely expose taxi-specific vocabulary to frontend clients.

### Route and DTO contract risk

| Contract surface | Risk |
|---|---|
| `drivers.controller.ts` DTO set: `CreateDriverDto`, `UpdateDriverStatusDto`, `CreateDriverDocumentDto` | Frontend clients consuming these DTOs will stay bound to `driver` as the top-level people concept. |
| `fleet.controller.ts` DTO set: `CreateFleetVehicleDto`, `UpdateFleetStatusDto`, `CreateMaintenanceRecordDto` | Frontend clients will treat assets as vehicles only. |
| `dispatch.controller.ts` DTOs: `CreateDispatchRunDto`, `CreateDispatchShiftDto`, `CreateDispatchIncidentDto`, `CreateDriverVehicleAssignmentDto` | Frontend clients will bind work, schedules, incidents, and assignments to taxi words rather than universal ones. |
| `dashboard` aliases: `drivers-summary`, `fleet-summary`, `dispatch-summary`, `trends/dispatch` | Existing frontend dashboards are very likely using these names directly. |
| `intelligence` endpoints: `dispatch-incident-summary`, `driver-compliance-explanation`, `fleet-readiness-explanation` | Exposes taxi-specific AI features as product-facing inference APIs. |

### Event and prompt vocabulary risk

| Surface | Evidence | Risk |
|---|---|---|
| Prompt template keys | `dispatch-incident-summary.v1`, `driver-compliance-explanation.v1`, `fleet-readiness-explanation.v1` | Template catalogs and UI/report consumers may encode taxi-specific use-case names. |
| Agent codes | `dispatch-risk-agent`, `driver-oversight-agent`, `fleet-compliance-agent` | Product and governance screens may show these names directly. |
| Entity types in agent context/execution | `dispatch-incident`, `driver`, `fleet-vehicle` | Frontend and governance/reporting layers may persist or display these values. |

## Taxi-Specific Vocabulary Still Exposed

| Vocabulary | Where still exposed |
|---|---|
| `driver` | routes, DTOs, Prisma models, dashboard summaries, intelligence APIs, agent runtime |
| `fleet` | routes, DTOs, Prisma models, dashboard summaries, intelligence APIs, agent runtime |
| `dispatch` | routes, DTOs, Prisma models, dashboard summaries, trend endpoints, intelligence APIs, agent runtime |
| `operator` | partial alias in routes and dashboard summaries; not yet a fully universal replacement |
| `vehicle` as the dominant asset noun | `fleet` controller/DTOs and AI explanations |
| `run` as taxi work execution noun | `dispatch` module DTOs and services |

## Universal Ownership Recommendations

| Legacy surface | Recommended universal owner | Why |
|---|---|---|
| Driver profile, credentials, status history | `workforce` | The universal people model already exists and matches this responsibility. |
| Fleet vehicles, maintenance, readiness | `assets` | The universal asset domain already owns these behaviors. |
| Dispatch zones and runs | `operations` | Work orders and operational zones are the universal execution layer. |
| Dispatch shifts | `scheduling` | Shift planning and lifecycle are already generalized there. |
| Driver/vehicle/run assignments | `assignments` | Universal resource allocation already exists. |
| Dispatch incidents | `incidents` | Universal operational incidents already exist. |
| Taxi-labeled dashboard summaries and trends | `dashboard` built on universal modules | The dashboard module should remain a read model, but be rebuilt on universal ownership. |
| Taxi-labeled AI explanations and agent personas | `intelligence` + `agents` using universal entity vocabulary | AI surfaces should become neutral and reusable across industries. |

## Recommended Refactor Sequence

1. **Freeze legacy taxi controllers as compatibility-only APIs**
   Keep them functional, but treat `drivers`, `fleet`, and `dispatch` as legacy-facing surfaces only.

2. **Make universal route families the only canonical APIs**
   `workforce`, `assets`, `operations`, `scheduling`, `assignments`, and `incidents` should become the documented target routes.

3. **Migrate dashboard reads off taxi tables first**
   `dashboard` is currently the largest concentrated taxi-coupling hotspot and affects multiple frontend command centers.

4. **Remove taxi-specific inference endpoints from the intelligence contract surface**
   Replace `driver`, `fleet`, and `dispatch` inference endpoints with workforce, asset, operations, and incident equivalents.

5. **Generalize the agent catalog and context builders**
   Replace hardcoded taxi-era agents and entity types with universal operational agent roles.

6. **Introduce adapters for frontend compatibility instead of duplicate domain ownership**
   When legacy responses are still needed, they should be projections over universal modules, not independent logic paths.

7. **Deprecate taxi-specific Prisma model usage in composition layers before schema deletion**
   The order should be: stop reading legacy models in `dashboard` / `intelligence` / `agents`, then plan write-path removal, then schema cleanup.
