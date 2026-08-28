# Action Proposals Engine

## Proposal Contract

Nexora Commerce generates bounded action proposals for human review. The API response exposes:

- `id`
- `type`
- `title`
- `summary`
- `reason`
- `evidence[]`
- `targetEntityType`
- `targetEntityId`
- `riskLevel`
- `priority`
- `status`
- `recommendedBy`
- `createdAt`

The persistence model remains `ActionProposal` plus `ActionProposalReview`, with extended proposal contract fields stored in `metadata` and mapped back into the API response.

## Implemented Proposal Types

- `investigate_metric_drop`
- `review_visibility_gap`
- `review_store_sync_issue`
- `review_payment_connection`
- `monitor_customer_decline`
- `inspect_product_anomaly`

## Generation Rules

The deterministic engine runs from current commerce context and produces at most 5 proposals per refresh.

Implemented rules:

- Missing or failed Shopify sync:
  Generate `review_store_sync_issue`

- Limited Shopify visibility or protected customer data restriction:
  Generate `review_visibility_gap`

- Missing or failed Stripe connection/sync:
  Generate `review_payment_connection`

- Revenue or order decline:
  Generate `investigate_metric_drop`

- Customer inactivity or repeat-demand decline:
  Generate `monitor_customer_decline`

- Product concentration or top-product dependency signal:
  Generate `inspect_product_anomaly`

Overlapping proposals are deduped by a stable `dedupeKey`.

## Evidence Model

Each proposal stores structured evidence in `metadata.evidence`.

Evidence sources include:

- revenue and order movement versus prior 24h window
- current signal descriptions
- daily brief signals and risks
- integration connection state
- sync freshness and sync failure state
- customer acquisition slowdown
- top-product concentration context

The UI renders:

- summary
- reason
- evidence bullets
- safety notes

## Governance Flow

Nexora does not execute proposals autonomously.

Governance states:

- `PENDING`
- `IN_REVIEW`
- `APPROVED`
- `REJECTED`
- `DEFERRED`
- `NEEDS_REVISION`
- `ARCHIVED`

Supported review actions:

- submit for review
- approve
- reject
- defer

Audit and notifications reuse the existing review and workflow audit infrastructure.

## API Contract

Primary product-facing endpoints:

- `GET /intelligence/action-proposals`
- `POST /intelligence/action-proposals/refresh`
- `POST /intelligence/action-proposals/approve`
- `POST /intelligence/action-proposals/reject`
- `POST /intelligence/action-proposals/defer`

Compatibility endpoints remain under `/ai/action-proposals` for existing surfaces.

## UI Rendering Rules

Actions page:

- show a full filterable proposal list
- support filtering by status, risk, and type
- show summary, reason, evidence, safety notes, risk, priority, and review status

Overview:

- show top action proposals through the Needs Attention layer

Proposal cards:

- must state what is being proposed
- must state why it exists
- must show evidence
- must show risk and safety notes
- must keep the reviewer in control
