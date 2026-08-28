# Outcome Analytics And ROI

## Response Contract

`OutcomeAnalyticsResponse`

- `organizationId`
- `generatedAt`
- `trust`
- `summary`
- `actionVolume`
- `outcomeSummary`
- `recommendationEffectiveness`
- `proposalReviewPatterns`
- `executionReliability`
- `learningTrend`
- `roiHighlights[]`
- `limitations[]`

## Section Definitions

- `summary`
  - Concise trust-aware operator summary of whether measured outcomes appear to be improving or not
- `actionVolume`
  - Actions executed
  - Proposals reviewed
  - Approvals, rejections, deferrals
  - Pending review count
- `outcomeSummary`
  - Positive, neutral, negative, and unknown outcomes
  - Positive outcome rate
- `recommendationEffectiveness`
  - Stronger and weaker recommendation or proposal types
  - Based on positive outcome rate, approval tendency, and execution success tendency
- `proposalReviewPatterns`
  - Approval, rejection, and defer rates
  - Repeated rejection themes when deterministically present
- `executionReliability`
  - Completed vs failed executions
  - Failure concentration by execution type
- `learningTrend`
  - Whether recent recorded outcomes are improving, stable, weakening, or still insufficient
- `roiHighlights`
  - 3-5 concrete value or limitation bullets
- `limitations`
  - Trust, low-data, and coverage caveats that materially affect interpretation

## Effectiveness Logic

- Aggregate by `recommendationType` from proposal metadata when available
- Fall back to proposal type or canonical proposal metadata type
- For each type:
  - `usageCount`
  - `positiveOutcomeRate`
  - `operatorApprovalRate`
  - `executionSuccessRate`
- Stronger types are ranked by:
  - positive outcome rate
  - approval rate
  - usage count
- Weaker types are ranked inversely

## Execution Reliability Logic

- Count finalized executions in the lookback window
- Separate intelligence quality from execution quality by tracking:
  - completed count
  - failed count
  - approval-pending count
  - success rate for finalized executions
  - failure concentration by execution type

## Trust-Aware Interpretation Rules

- If trust is limited or issue-detected, ROI interpretation must surface current limitations
- If payments visibility is missing, payments-related value measurement must be caveated
- If there are fewer than 4 recent outcomes, the system must state that strong conclusions are not yet possible
- No fake dollar attribution or unsupported ROI math is allowed

## API Contract

Canonical:

- `GET /api/v1/intelligence/outcome-analytics`
- `POST /api/v1/intelligence/outcome-analytics/refresh`

Compatibility:

- `GET /api/v1/ai/outcome-analytics`
- `POST /api/v1/ai/outcome-analytics/refresh`

Supports:

- `organizationId`
- optional `lookbackDays` in phase 1

## Frontend Surface Contract

Primary route:

- `/shopify/outcomes`

Layout:

- Top:
  - trust panel
  - summary panel
- Middle:
  - ROI highlights
  - review patterns
- Lower:
  - recommendation effectiveness
  - execution reliability
  - learning trend

## Relationship To Other Systems

- Built directly on the Learning Loop
- Reuses the Data Trust layer for interpretation boundaries
- Intended to be reusable by:
  - Executive Copilot
  - Executive Q&A
  - future ROI storytelling surfaces

## Phase 1 Limitations

- No direct dollar ROI attribution
- No causal attribution beyond recorded outcomes and review/execution patterns
- Recommendation effectiveness remains bounded by current action and outcome volume
