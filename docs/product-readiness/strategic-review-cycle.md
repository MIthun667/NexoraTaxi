# Strategic Review Cycle

## Report Contract

`StrategicReviewReport`

- `id`
- `organizationId`
- `reviewWindow`
- `generatedAt`
- `trust`
- `summary`
- `priorityProgress[]`
- `signalChanges[]`
- `actionReview`
- `outcomeReview`
- `scenarioNotes[]`
- `executiveFocus[]`
- `limitations[]`

`PriorityProgressItem`

- `priorityId`
- `title`
- `status`
- `progressState`
- `linkedEvidence[]`
- `nextStep`

Supported review windows:

- `last_7_days`
- `current_week`
- `last_30_days`

Supported progress states:

- `improving`
- `stable`
- `blocked`
- `weakening`
- `insufficient_data`

## Review Generation Rules

The review layer is deterministic-first and generated from the canonical Nexora stack:

- active strategic plan and priorities
- canonical data trust
- recent signals
- recent proposals and reviews
- recent executions
- recent recorded outcomes
- linked scenario summaries
- canonical outcome analytics

Generated reviews are persisted as structured snapshots in `strategic_review_reports` so weekly findings remain auditable and reusable.

## Priority Progress Logic

Priority progress is evidence-backed and derived from linked artifacts:

- successful executions and positive outcomes push a priority toward `improving`
- active high-severity linked signals, failed executions, or explicit blocked status push toward `blocked`
- negative outcomes or unresolved signals with pending proposals push toward `weakening`
- sparse linked evidence produces `insufficient_data`

The review layer does not claim progress without supporting artifacts.

## Signal / Action / Outcome Review Rules

### Signal changes

The review surfaces a concise set of important:

- `new` signals
- `escalated` active signals
- `resolved` signals

### Action review

The review summarizes:

- proposals approved, rejected, deferred, pending
- executions completed, failed, pending
- open governance or execution risks

### Outcome review

The review summarizes:

- positive, negative, neutral, unknown outcomes
- positive outcome rate
- current learning trend interpretation

If recent activity is too light, the review says so directly.

## Trust-Aware Interpretation

Trust materially shapes the review:

- trust limitations are carried directly into report limitations
- delayed or incomplete visibility reduces confidence in conclusions
- missing payments visibility is surfaced when it constrains interpretation
- low-activity windows are described as directional only

## API Contract

Canonical endpoints:

- `GET /api/v1/intelligence/strategic-reviews`
- `GET /api/v1/intelligence/strategic-reviews/:id`
- `POST /api/v1/intelligence/strategic-reviews/generate`

Compatibility endpoints:

- `GET /api/v1/ai/strategic-reviews`
- `GET /api/v1/ai/strategic-reviews/:id`
- `POST /api/v1/ai/strategic-reviews/generate`

Scoping rules:

- organization scope is resolved through the current principal
- cross-org access is blocked unless the principal can access that org
- generate returns a clear empty-state response when no active strategic plan exists

## Frontend Surface Contract

The first review surface includes:

- trust-aware review summary
- priority progress list
- signal changes
- action review
- outcome review
- scenario notes
- executive focus
- recent review history

The page is leadership-oriented and intentionally concise. It is not a raw activity feed.

## Relationship to Strategic Planning, Copilot, Outcomes, and Scenarios

- Strategic Planning supplies the active priorities and linked artifacts.
- Outcome Analytics supplies the learning and effectiveness interpretation baseline.
- Scenario Planning supplies bounded scenario notes for linked strategic scenarios.
- Executive Copilot and Executive Q&A can reuse strategic review snapshots later for recurring weekly business review experiences.

The review layer summarizes progress against strategy. It does not replace the planning workspace.
