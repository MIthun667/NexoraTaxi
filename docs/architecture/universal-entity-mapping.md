# Universal Entity Mapping

## 1. Purpose
The platform needs universal abstractions because the long-term product is not a taxi system, but a reusable AI Company Operating System. Industry-specific naming such as `driver`, `fleet`, and `dispatch` narrows the system to one vertical and makes AI reasoning, reporting, integrations, and product packaging harder to generalize.

Universal abstractions help the codebase:
- describe business capabilities in industry-neutral language
- support multiple industries without duplicating core domains
- keep AI retrieval, reasoning, reports, and governance aligned to one stable vocabulary
- reduce future migration cost by converging legacy modules toward reusable enterprise concepts

This document is the source of truth for how existing modules and nouns should be interpreted as universal business concepts.

## 2. Core Universal Business Concepts
The following concept set is grounded in the current codebase and current architecture direction.

| Universal concept | Meaning in this platform | Current codebase anchors |
|---|---|---|
| `organization` | The tenant-scoped company or business entity operating inside the platform. | `platform/organizations`, `tenancy` |
| `people` | Human records that represent employees, operators, and workforce members. | `platform/employees`, `workforce`, legacy `drivers` |
| `assets` | Operational resources such as vehicles, tools, devices, or equipment. | `assets`, legacy `fleet` |
| `operations` | Units of executable business work and operational territories. | `operations`, legacy `dispatch` |
| `tasks` | Structured work steps and actionable units inside workflows or operational execution. | `workflows`, `operations`, `approvals` |
| `assignments` | Links that allocate people and assets to shifts, work orders, or each other. | `assignments`, legacy `dispatch` |
| `schedules` | Planning containers and time-bound shifts for operational coverage. | `scheduling`, legacy `dispatch` |
| `incidents` | Operational exceptions, disruptions, risks, or escalation events. | `incidents`, legacy `dispatch` |
| `workflows` | Business process definitions, instances, tasks, and escalations. | `workflows` |
| `approvals` | Human review and authorization flows over business actions or state changes. | `approvals` |
| `notifications` | System-generated messages, alerts, and delivery events. | `notifications`, `integrations` |
| `events` | Durable domain signals that describe business state changes. | `events`, `notifications/domain-events.service`, `triggers` |
| `reports` | Human-readable decision artifacts and summaries derived from operations and AI. | `reports`, `dashboard`, `governance` |
| `policies` | Enforced business, AI, tenant, and execution constraints. | `authz`, `agents/agent-policy.service`, module `policies/` folders, `tenancy` |
| `agents` | AI runtime actors that observe, reason, propose actions, and verify outcomes. | `agents`, `governance` |
| `actions` | Controlled execution of system or agent proposals against domain services. | `actions` |
| `signals` | Metrics, alerts, trends, observations, risks, and monitoring outputs. | `dashboard`, `governance`, `observability`, `retrieval`, `knowledge-graph` |

## 3. Existing Module to Universal Concept Mapping

| Existing module | Current meaning | Universal concept | Keep as-is / generalize / eventually merge |
|---|---|---|---|
| `actions` | Executes approved or policy-allowed AI proposals through domain handlers. | `actions` | Keep as-is |
| `agents` | Agent runtime, reasoning, skills, verification, policies, and run orchestration. | `agents` | Keep as-is |
| `approvals` | Human approval requests, steps, queue, and decisions. | `approvals` | Keep as-is |
| `assets` | Universal asset records, maintenance, and status tracking. | `assets` | Keep as-is |
| `assignments` | Universal resource allocation between workforce, assets, shifts, and work orders. | `assignments` | Keep as-is |
| `audit` | Immutable cross-cutting trace of important system actions. | `signals` / `policies` support layer | Keep as-is |
| `auth` | Authentication and token management. | `policies` / control plane | Keep as-is |
| `authz` | Authorization and RBAC enforcement. | `policies` / control plane | Keep as-is |
| `dashboard` | Aggregated read models, summaries, trends, and alerts for UI surfaces. | `signals` / `reports` | Generalize |
| `dispatch` | Taxi dispatch zones, shifts, runs, incidents, and driver-vehicle assignments. | `operations`, `schedules`, `assignments`, `incidents` | Eventually merge |
| `drivers` | Taxi-specific operator records, documents, and status flows. | `people` | Eventually merge |
| `events` | Shared domain-event constants and event typing. | `events` | Keep as-is |
| `fleet` | Taxi-specific vehicle and maintenance management. | `assets` | Eventually merge |
| `governance` | AI observability, policy monitoring, trust, health, and impact tracking. | `signals`, `policies`, `agents` support layer | Keep as-is |
| `health` | Liveness, readiness, and dependency checks. | `signals` / infrastructure health | Keep as-is |
| `incidents` | Universal operational incidents and incident actions. | `incidents` | Keep as-is |
| `integrations` | External connectors, sync, connector actions, and webhook ingestion. | `notifications`, `events`, `signals` support layer | Keep as-is |
| `intelligence` | LLM inference utilities, prompt templates, and operational summarization. | `agents` / `reports` / `signals` support layer | Generalize |
| `knowledge-graph` | Graph projection and analytics over operational entities and relationships. | `signals` / `agents` support layer | Keep as-is |
| `notifications` | In-app notification delivery and event publication support. | `notifications` | Keep as-is |
| `observability` | Logging, metrics, tracing, alerting, and system reliability signals. | `signals` | Keep as-is |
| `operations` | Universal work orders and operational zones. | `operations` | Keep as-is |
| `platform` | Organizations, departments, positions, and employees. | `organization`, `people`, `policies` support layer | Keep as-is |
| `reports` | Persisted AI decision reports and evidence-based summaries. | `reports` | Keep as-is |
| `retrieval` | Structured context gathering for agents across domains. | `signals` / `agents` support layer | Keep as-is |
| `scheduling` | Universal schedule plans, shifts, and capacity. | `schedules` | Keep as-is |
| `tenancy` | Organization isolation, plans, billing, usage metering, and enforcement. | `organization`, `policies` support layer | Keep as-is |
| `triggers` | Event-trigger evaluation and automation dispatch rules. | `events`, `actions`, `agents` support layer | Keep as-is |
| `workflows` | Process definitions, instances, tasks, and task actions. | `workflows`, `tasks` | Keep as-is |
| `workforce` | Universal workforce members, credentials, and status history. | `people` | Keep as-is |

## 4. Taxi-Specific to Universal Translation Rules
These translation rules are derived from the existing codebase and should guide future renaming, adapter design, and refactor prompts.

| Taxi-specific term | Universal translation | Notes |
|---|---|---|
| `driver` | `worker`, `operator`, or `workforce member` | Prefer `workforce member` when referring to the canonical domain model. |
| `driver document` | `credential document` | Covers licenses, certifications, permits, background checks, and compliance artifacts. |
| `driver status` | workforce operational / compliance / availability status | Split status by category rather than keeping a single role-specific lifecycle. |
| `fleet vehicle` | `asset` | Vehicles are one asset subtype, not the whole asset model. |
| `fleet maintenance record` | `asset maintenance record` | Maintenance should apply to any operational asset. |
| `fleet status` | asset operational / compliance / availability status | Normalize status categories across all asset types. |
| `dispatch zone` | `operational zone` | A reusable territory, location scope, or coverage area. |
| `dispatch shift` | `schedule shift` | Shift scheduling should remain separate from dispatch-specific language. |
| `dispatch run` | `work order` or `operational task` | Use `work order` where the current universal model already exists. |
| `driver vehicle assignment` | `resource assignment` | Prefer a generalized assignment object between workforce, assets, shifts, and work. |
| `dispatch incident` | `operational incident` | Incidents should be framed as reusable operational exceptions. |
| `dispatch analytics` | operations / scheduling / assignment / incident signals | Dashboard and reporting names should reflect universal business capabilities. |
| `driver compliance explanation` | workforce compliance explanation | Intelligence outputs should use the universal workforce vocabulary. |
| `fleet readiness explanation` | asset readiness explanation | Intelligence outputs should use the universal asset vocabulary. |
| `dispatch incident summary` | operational incident summary | AI summaries should not assume dispatch as the dominant domain. |

## 5. Generalization Principles
1. **Prefer business capability names over industry nouns**
   Use names like `workforce`, `assets`, `operations`, and `assignments` instead of vertical-specific nouns such as `drivers`, `fleet`, and `dispatch`.

2. **Model roles, not job titles, as the core abstraction**
   The system should represent reusable people and resource capabilities first, then specialize by metadata, status, or subtype.

3. **Keep operational records industry-neutral by default**
   Core entities such as work orders, schedule shifts, incidents, and resource assignments should remain valid across multiple industries.

4. **Treat legacy industry modules as compatibility layers, not target architecture**
   Taxi-era modules may stay temporarily for API compatibility, but new domain logic should land in universal modules.

5. **Align AI vocabulary with universal business concepts**
   Retrieval, reasoning, skills, decision reports, governance signals, and graph relationships should reference the same universal nouns.

6. **Separate source-of-truth domains from read models**
   Dashboard, observability, and executive summaries should compose universal operational concepts rather than becoming their own alternate business taxonomy.

7. **Preserve cross-cutting modules when their abstraction is already reusable**
   Modules such as workflows, approvals, notifications, tenancy, observability, and integrations already fit the long-term platform shape and should be extended, not renamed unnecessarily.

## 6. Refactor Guidance
These are the highest-priority abstraction shifts for future prompts. This document does not change code now.

1. **Converge `drivers` into `workforce`**
   Treat `workforce` as the canonical people/operations model and progressively reduce `drivers` to a legacy adapter surface.

2. **Converge `fleet` into `assets`**
   Move all asset readiness, maintenance, and availability logic toward the universal `assets` module.

3. **Split `dispatch` into universal operational concerns**
   Re-home dispatch semantics into `operations`, `scheduling`, `assignments`, and `incidents` depending on responsibility.

4. **De-taxi the `dashboard` module**
   Replace route names and summary sections that still assume `drivers`, `fleet`, and `dispatch` as first-class product language.

5. **De-taxi the `intelligence` module**
   Replace taxi-specific prompt schemas and inference DTO names with universal workforce, asset, operations, and incident language.

6. **Standardize universal entity names across AI layers**
   Ensure `retrieval`, `agents`, `knowledge-graph`, `reports`, `governance`, and `triggers` all use the same universal entity vocabulary.

7. **Document module ownership boundaries more explicitly**
   Future work should define which module is authoritative for each universal business concept so duplicate write paths do not survive the migration.
