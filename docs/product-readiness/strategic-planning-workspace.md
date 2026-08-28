# Strategic Planning Workspace

## Plan Contract

`StrategicPlan`

- `id`
- `organizationId`
- `title`
- `planningWindow`
- `status`
- `summary`
- `priorities[]`
- `createdAt`
- `updatedAt`

## Priority Contract

`StrategicPriority`

- `id`
- `strategicPlanId`
- `title`
- `description`
- `category`
- `status`
- `urgency`
- `linkedSignals[]`
- `linkedRecommendations[]`
- `linkedProposals[]`
- `linkedScenarios[]`
- `linkedExecutions[]`
- `linkedAgentRuns[]`
- `linkedOutcomeSummary`
- `successCriteria[]`
- `owner`
- `targetDate`
- `notes`
- `createdAt`
- `updatedAt`

Phase 1 keeps one active plan per organization and planning window through service rules.

## Candidate Generation Rules

Candidate priorities are deterministic and grounded in existing Nexora intelligence:

- repeated `revenue_drop` or `order_slowdown` -> revenue stabilization
- trust degradation, `sync_issue`, or `data_coverage_limit` -> trust restoration
- repeated `customer_slowdown` -> customer momentum recovery
- `payment_visibility_gap` or missing Stripe visibility -> payments visibility restoration
- `demand_spike` or `product_concentration_risk` -> catalog or operations pressure management

Candidate generation is capped to a small high-signal set and avoids generic filler priorities.

## Linking Model

Priorities can link to:

- signals
- recommendations
- proposals
- scenarios
- executions
- agent runs
- outcome summary

Links are stored as structured JSON references so leadership can see why a priority exists without requiring deep graph editing.

## API Contract

Canonical:

- `GET /api/v1/intelligence/strategic-plan`
- `POST /api/v1/intelligence/strategic-plan`
- `PATCH /api/v1/intelligence/strategic-plan/:id`
- `POST /api/v1/intelligence/strategic-plan/:id/generate-candidates`
- `POST /api/v1/intelligence/strategic-plan/:id/priorities`
- `PATCH /api/v1/intelligence/strategic-plan/:id/priorities/:priorityId`

Compatibility:

- `GET /api/v1/ai/strategic-plan`
- `POST /api/v1/ai/strategic-plan`
- `PATCH /api/v1/ai/strategic-plan/:id`
- `POST /api/v1/ai/strategic-plan/:id/generate-candidates`
- `POST /api/v1/ai/strategic-plan/:id/priorities`
- `PATCH /api/v1/ai/strategic-plan/:id/priorities/:priorityId`

## Frontend Surface Contract

The first version includes:

- plan summary
- planning window and status
- candidate priorities generated from Nexora intelligence
- active priority cards
- linked artifact context
- status tracking for each priority

This is a structured leadership workspace, not a generic task board.

## Relationships

- Executive Copilot provides the current leadership summary context.
- Scenario Planning provides directional what-if links for priorities.
- Outcome Analytics provides measured-value context and learning trend references.
- Strategic planning consumes the canonical trust, signals, recommendations, proposals, executions, and agent outputs rather than duplicating them.
