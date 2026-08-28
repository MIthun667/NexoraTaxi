# Agent Insight Schema

## Purpose of the Agent Insight abstraction

The platform already has several adjacent output patterns:

- dashboard alerts and summaries
- intelligence-generated summaries
- report findings and recommendations
- canonical operational signals
- canonical action proposal scaffolding

What is still missing is one shared structure for **explainable AI-ready insight packaging**.

`AgentInsight` fills that gap. It gives the platform a stable format for packaging:

- signal-derived findings
- operational summaries
- recommendation context
- command-center insight cards

without forcing a full agent orchestration layer yet.

## Current related patterns found in the codebase

The current repo already contains these related but separate patterns:

- `CanonicalSignal`
  - for operational findings and anomalies
- `DecisionReport` inputs/outputs
  - `summary`, `findings`, `recommendations`, `evidence`
- intelligence outputs
  - `operational summary`
  - `dispatch incident summary`
  - `approval explanation`
  - `driver compliance explanation`
  - `fleet readiness explanation`
- dashboard alerts
  - alert-card-style operational read models

These patterns are useful, but they are not yet unified under one reusable insight contract.

## Canonical Agent Insight structure

The shared contract added in this prompt is `AgentInsight`.

Fields:

- `insightId`
- `insightType`
- `insightCategory`
- `title`
- `summary`
- `severity`
- `status`
- `sourceModule`
- `sourceSystem`
- `organizationId`
- `primarySignalIds`
- `relatedEntityType`
- `relatedEntityId`
- `supportingEvidence`
- `metrics`
- `recommendationSummary`
- `proposedActionIds`
- `generatedAt`
- `metadata`

This shape is intentionally minimal and future-safe.

## Insight categories

The current shared categories are:

- `people`
- `assets`
- `operations`
- `workflows`
- `approvals`
- `compliance`
- `executive`
- `system`

These are grounded in the current platform direction and existing module structure.

## Supporting enums/types

The prompt introduced small supporting constants for:

- insight category
- insight severity
- insight status
- insight type

Current insight types include:

- `SIGNAL_DERIVED`
- `SUMMARY`
- `FINDING_BUNDLE`
- `RECOMMENDATION_BUNDLE`
- `EXECUTIVE_BRIEF`

## Relationship to Signal and Action Proposal

### Relationship to Signal

Signals are lower-level operational findings.

Examples:

- attendance coverage gap
- spend deviation
- stalled workflow task

An `AgentInsight` can package one or more signals into a form better suited for:

- command-center cards
- summaries
- explainability surfaces
- future agent responses

This prompt adds `mapSignalToInsight(...)` so signal-backed insight packaging can begin safely.

### Relationship to Action Proposal

Action Proposals describe potential changes or actions.

An `AgentInsight` does not execute anything. Instead, it can:

- summarize why attention is needed
- attach evidence
- reference related proposed actions later via `proposedActionIds`

This keeps insights explanatory and action proposals operational.

## What was safely introduced in this prompt

Added shared files under:

- `apps/api/src/common/intelligence/`

Files added:

- `agent-insight.interface.ts`
- `agent-insight-category.constants.ts`
- `agent-insight-severity.constants.ts`
- `agent-insight-status.constants.ts`
- `agent-insight-type.constants.ts`
- `agent-insight.util.ts`
- `index.ts`

Safe helper functions added:

- `buildAgentInsight(...)`
- `mapSignalToInsight(...)`
- `inferInsightCategoryFromSignal(...)`

Also added focused TODOs in:

- `dashboard.service.ts`
- `intelligence.service.ts`
- `report-risk-analysis.service.ts`

## What was intentionally left unchanged

To preserve compatibility, this prompt intentionally did **not** change:

- Prisma schema
- report persistence
- dashboard response contracts
- intelligence route outputs
- signal generation behavior
- action proposal behavior
- seeded data
- agent runtime behavior

No orchestration or insight persistence was added.

## Recommended next step

The next clean step is:

1. adapt existing anomaly signals into an internal `AgentInsight[]` bundle
2. use that bundle in one read surface first, likely dashboard alerts or executive summaries
3. only after that, align report findings/recommendations and future agent responses to the same insight contract

That sequence keeps the migration incremental and backward compatible.
