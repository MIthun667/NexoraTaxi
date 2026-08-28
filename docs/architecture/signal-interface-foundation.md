# Signal Interface Foundation

## Purpose of the Signal abstraction
The platform already produces many operational findings, alerts, risks, summaries, and insight-like outputs across dashboard, intelligence, retrieval, observability, reports, and knowledge graph modules. Those outputs are useful, but they do not yet share one canonical shape.

A shared Signal abstraction gives the platform a stable way to represent:
- operational alerts
- monitoring findings
- risk indicators
- recommendation evidence
- anomaly-like outputs
- intelligence summaries and structured signals

This prompt introduces the contract layer only. It does **not** implement full anomaly detection, recommendation engines, or signal persistence changes.

## Current related patterns found in the codebase
The current codebase already contains several signal-adjacent concepts:

| Area | Existing pattern |
|---|---|
| `dashboard` | operational alerts, summary cards, trend series, severity-based dashboard outputs |
| `intelligence` | operational summaries, approval explanations, dispatch incident summaries, driver/fleet explanation outputs |
| `retrieval` | `riskSignals` in `RetrievalBundle` |
| `knowledge-graph` | `GraphInsight` analytics with severity and message |
| `observability` | system alerts, health check summaries, reliability incident signals |
| `reports` | findings, risk analysis, recommendations |
| `notifications` | notification severity and alert-style messaging |

The platform therefore already behaves as if it has signals, but those signals are currently represented through multiple local types instead of one shared contract.

## Canonical Signal structure
A shared signal contract was introduced under:
- `apps/api/src/common/signals/signal.interface.ts`
- `apps/api/src/common/signals/signal-category.constants.ts`
- `apps/api/src/common/signals/signal-severity.constants.ts`
- `apps/api/src/common/signals/signal-status.constants.ts`
- `apps/api/src/common/signals/signal.util.ts`
- `apps/api/src/common/signals/index.ts`

Canonical signal shape:

| Field | Meaning |
|---|---|
| `signalId` | identifier if available |
| `signalType` | stable signal code or type name |
| `signalCategory` | universal category |
| `title` | short operator-facing title |
| `summary` | concise human-readable explanation |
| `severity` | severity level |
| `status` | current signal status |
| `sourceModule` | producing backend module |
| `sourceSystem` | source system such as dashboard, intelligence, retrieval, observability |
| `entityType` | primary entity type |
| `entityId` | primary entity identifier |
| `relatedEntityIds` | related entities if applicable |
| `organizationId` | tenant boundary |
| `detectedAt` | detection timestamp |
| `evidence` | structured supporting evidence |
| `metrics` | structured numeric or calculated metrics |
| `metadata` | additional contextual data |

## Signal categories
Only categories justified by the current repo direction were added.

| Category | Meaning |
|---|---|
| `people` | workforce, operators, people readiness, staffing-related signals |
| `assets` | asset readiness, maintenance, fleet-derived signals |
| `operations` | work orders, incidents, assignments, dispatch/operations signals |
| `workflows` | workflow execution and task-related signals |
| `approvals` | approval queue, approval bottleneck, and review signals |
| `compliance` | compliance-specific findings across people and assets |
| `notifications` | communication and alert-delivery signals |
| `system` | infrastructure, observability, and uncategorized platform signals |

## Severity and status definitions
### Severity
The shared severity constants are:
- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

### Status
The shared status constants are:
- `INFORMATIONAL`
- `OPEN`
- `ACKNOWLEDGED`
- `RESOLVED`

These are intentionally small and practical so existing modules can adopt them incrementally.

## What was safely introduced in this prompt
The following non-breaking scaffolding was introduced:

### Shared code additions
A new shared signal contract layer under `apps/api/src/common/signals`.

### Helper utilities
A minimal normalization utility was added:
- `inferSignalCategory(signalType)`
- `normalizeSignal(input)`
- `buildSignal(input)`

This allows future modules to construct standardized signals without changing their internal domain logic yet.

### Focused migration markers
TODO comments were added in:
- `dashboard/dashboard.service.ts`
- `intelligence/intelligence.service.ts`
- `reports/report-risk-analysis.service.ts`

These mark where current alert/finding/summary logic should later migrate toward the shared signal contract.

## What was intentionally left unchanged
To preserve compatibility, this prompt intentionally did **not** change:
- Prisma schema
- dashboard response shapes
- intelligence API response shapes
- observability alert models
- retrieval `riskSignals` shape
- knowledge graph insight shape
- report schemas or report persistence
- seeded data

## Recommended next step
1. Add adapters from dashboard alerts to `CanonicalSignal`.
2. Add adapters from retrieval `riskSignals` and knowledge graph `GraphInsight` into the shared signal contract.
3. Normalize intelligence-generated summary/risk outputs into signal bundles.
4. Standardize executive, operational, and AI dashboards to consume canonical signals where possible.
5. Only after shared read models converge, consider persistent signal storage or signal history features.
