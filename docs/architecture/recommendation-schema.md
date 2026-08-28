# Recommendation Schema

## Purpose of the Recommendation abstraction

The platform already contains several partial recommendation-like patterns:

- `recommendedActions` in intelligence responses
- `immediateActions` and `escalationRecommendation` in incident summaries
- action proposal summaries in agent/action flows
- report `recommendations` fields

These all point toward the same architectural need: one shared, reviewable structure for expressing suggested next steps.

`Recommendation` fills that gap. It provides a canonical bridge between:

- `Signal`
- `AgentInsight`
- `ActionProposal`

without forcing execution, approvals, or agent orchestration yet.

## Current related patterns found in the codebase

Current similar patterns include:

- intelligence prompt/response schemas
  - `recommendedActions`
  - `immediateActions`
  - `suggestedDecision`
- report outputs
  - `recommendations`
- action system
  - proposal summaries
  - requested actions
- dashboard guidance style TODO surfaces

These are useful, but they are not yet normalized into one reusable contract.

## Canonical Recommendation structure

The shared contract added in this prompt is `Recommendation`.

Fields:

- `recommendationId`
- `recommendationType`
- `recommendationCategory`
- `title`
- `summary`
- `rationale`
- `priority`
- `status`
- `sourceModule`
- `sourceSystem`
- `organizationId`
- `relatedInsightIds`
- `relatedSignalIds`
- `targetEntityType`
- `targetEntityId`
- `suggestedActionType`
- `approvalRequired`
- `proposedActionId`
- `estimatedImpact`
- `confidence`
- `generatedAt`
- `metadata`

This shape is intentionally minimal and designed for future reviewable automation.

## Recommendation categories

The current categories are:

- `people`
- `assets`
- `operations`
- `workflows`
- `approvals`
- `compliance`
- `executive`
- `system`

These align with the current universal platform direction.

## Supporting enums/types

This prompt adds small supporting constants for:

- recommendation category
- recommendation priority
- recommendation status
- recommendation type

Current recommendation types include:

- `OPERATIONAL_NEXT_STEP`
- `RISK_MITIGATION`
- `ESCALATION`
- `APPROVAL_DECISION_SUPPORT`
- `REVIEW_ACTION`

## Relationship to Agent Insight and Action Proposal

### Relationship to Agent Insight

`AgentInsight` explains what is happening and why it matters.

`Recommendation` expresses what should happen next.

This prompt adds:

- `mapInsightToRecommendation(...)`

so insight-driven next steps can be packaged consistently.

### Relationship to Action Proposal

`ActionProposal` is the action-layer structure for requested operational change.

`Recommendation` sits before that. It can:

- summarize a suggested next step
- point to a target entity
- declare whether approval may be needed
- later link to a concrete action proposal

This prompt adds:

- `mapActionProposalToRecommendation(...)`

so future review surfaces can present proposals in recommendation language without changing action execution behavior.

## What was safely introduced in this prompt

Added shared files under:

- `apps/api/src/common/intelligence/`

Files added:

- `recommendation.interface.ts`
- `recommendation-category.constants.ts`
- `recommendation-priority.constants.ts`
- `recommendation-status.constants.ts`
- `recommendation-type.constants.ts`
- `recommendation.util.ts`

Helpers added:

- `buildRecommendation(...)`
- `deriveRecommendationPriority(...)`
- `mapInsightToRecommendation(...)`
- `mapActionProposalToRecommendation(...)`

Also added focused TODOs in:

- `intelligence.service.ts`
- `dashboard.service.ts`
- `report-risk-analysis.service.ts`

## What was intentionally left unchanged

To preserve compatibility, this prompt intentionally did **not** change:

- Prisma schema
- action execution
- approval flows
- workflow behavior
- dashboard response contracts
- intelligence route outputs
- report persistence
- seed data

No orchestration or recommendation persistence was introduced.

## Recommended next step

The next clean step is:

1. derive `Recommendation[]` from signal-backed `AgentInsight[]`
2. expose those recommendations in one internal read surface first
3. only then align report recommendations and agent proposal review screens to the same structure

That keeps the migration incremental, explainable, and backward compatible.
