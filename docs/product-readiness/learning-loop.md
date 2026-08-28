# Learning Loop

## Purpose

The phase 1 Learning Loop gives Nexora Commerce a deterministic, auditable feedback layer.

It records:

- action outcomes
- operator decisions
- lightweight learning insights

It uses that history to slightly adjust recommendation ranking without introducing hidden or autonomous logic.

## Learning Model

The learning layer uses two persisted records:

### ActionOutcome

`ActionOutcome` stores the observed result of an executed action.

Fields:

- `executionId`
- `proposalId`
- `recommendationId`
- `organizationId`
- `outcomeType`
- `outcomeScore`
- `impactMetrics`
- `notes`
- `recordedAt`

Outcome types:

- `POSITIVE`
- `NEUTRAL`
- `NEGATIVE`
- `UNKNOWN`

### DecisionLog

`DecisionLog` stores operator decisions on action proposals.

Fields:

- `proposalId`
- `organizationId`
- `decision`
- `decidedByUserId`
- `decidedAt`
- `reason`
- `metadata`

## Outcome Recording Flow

### Automatic recording

`AiExecutionService` automatically records outcomes when an execution reaches a terminal state:

- successful execution -> `POSITIVE`
- failed execution -> `NEGATIVE`

### Operator feedback

The Actions screen lets operators record:

- `This helped`
- `Not useful`

This writes to `POST /api/v1/intelligence/learning/outcome`.

Outcome recording is scoped to the execution organization and only allowed after execution is finalized.

## Decision Recording Flow

`ActionProposalReviewService` records a `DecisionLog` whenever a proposal is:

- approved
- rejected
- deferred
- sent for revision

This keeps recommendation-to-proposal governance traceable.

## Recommendation Ranking Adjustment

Base ranking still uses:

- urgency
- confidence
- freshness
- stable title tie-break

Learning adds two bounded multipliers:

### Historical effectiveness

`AiLearningService.getHistoricalEffectivenessScore()`

- starts at `1.0`
- increases for recent positive outcomes
- decreases for recent negative outcomes
- bounded between `0.4` and `1.5`

### Decision bias

`AiLearningService.getDecisionBiasScore()`

- starts at `1.0`
- decreases if the same recommendation type has been repeatedly rejected
- bounded to modest down-ranking only

These values are written into recommendation metadata as:

- `historicalEffectiveness`
- `decisionBias`

The recommendation engine uses them as secondary ranking signals. They never fully suppress a recommendation.

## API Endpoints

Canonical:

- `GET /api/v1/intelligence/learning/insights`
- `POST /api/v1/intelligence/learning/outcome`

Compatibility:

- `GET /api/v1/ai/learning/insights`
- `POST /api/v1/ai/learning/outcome`

## Learning Insights Response

The lightweight insights endpoint returns:

- `summary.totalActionsTracked`
- `summary.positiveOutcomeRate`
- `summary.operatorApprovalRate`
- `recentOutcomes`
- `recentDecisions`

This is intentionally lightweight in phase 1 and suitable for future operator-facing surfaces.

## Integration Points

- `AiExecutionService` records automatic outcomes and exposes executions with `outcome`
- `ActionProposalReviewService` records operator decisions
- `AiRecommendationService` consumes learning scores during ranking
- `ActionsScreen` lets operators submit manual feedback

## Safety And Traceability Principles

- deterministic only
- no model-driven learning
- no hidden scoring logic
- no cross-organization access
- no autonomous execution changes from feedback alone
- all ranking influence is bounded and inspectable

## Current Limitations

Phase 1 intentionally does not include:

- a dedicated learning analytics page
- complex attribution across multiple recommendations
- automatic recommendation suppression
- predictive modeling

The current implementation is a transparent self-improvement layer, not an ML system.
