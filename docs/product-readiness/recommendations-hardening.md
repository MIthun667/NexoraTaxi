# Recommendations Hardening

## Recommendation Contract

Nexora Commerce recommendations are now advisory-first and distinct from both signals and action proposals.

Canonical contract:

```ts
Recommendation {
  id
  type
  title
  summary
  rationale
  evidence[]
  urgency
  expectedOutcome
  affectedArea
  confidence
  status
  createdAt
  updatedAt
}
```

Compatibility notes:

- `category` remains populated for persistence compatibility and legacy consumers.
- `priority` remains populated as an uppercase mirror of `urgency`.
- `description` remains populated as a compatibility mirror of `summary`.
- `isActive` still mirrors `status === "active"` in the current Prisma model.

## Advisory Boundary

Recommendations are now explicitly separated from the surrounding layers:

- Signals
  - what happened
- Recommendations
  - what the operator should consider doing
- Action Proposals
  - what bounded follow-up action should be reviewed

Examples:

- Signal: `Revenue is down versus the previous day`
- Recommendation: `Review revenue decline drivers before changing pricing or acquisition`
- Action Proposal: `Investigate revenue and order decline`

Recommendations must never:

- look like alerts
- look like execution requests
- ask for direct approval
- duplicate signal titles word-for-word

## Taxonomy

Implemented recommendation types:

- `improve_visibility`
- `review_sync_health`
- `monitor_revenue_decline`
- `investigate_customer_slowdown`
- `reduce_product_concentration`
- `review_payment_reliability`
- `capitalize_on_demand_spike`
- `validate_unusual_change`

Urgency values:

- `low`
- `medium`
- `high`

Affected areas:

- `revenue`
- `orders`
- `customers`
- `products`
- `integrations`
- `payments`
- `data_quality`

Confidence values:

- `low`
- `medium`
- `high`

Status values:

- `active`
- `archived`
- `superseded`

## Generation Rules

Recommendations are deterministic-first and built from:

- canonical signals
- commerce metrics
- integration state
- sync freshness
- visibility limits

Current rules:

- `improve_visibility`
  - generated from `data_coverage_limit`
- `review_sync_health`
  - generated from `sync_issue`
- `monitor_revenue_decline`
  - generated from `revenue_drop` or `order_slowdown`
- `investigate_customer_slowdown`
  - generated from `customer_slowdown`
- `reduce_product_concentration`
  - generated from `product_concentration_risk`
- `review_payment_reliability`
  - generated from `payment_visibility_gap`
- `capitalize_on_demand_spike`
  - generated from `demand_spike`
  - also used as the low-priority stable fallback when no stronger advisory recommendation is active
- `validate_unusual_change`
  - generated from `unusual_change`

Generation constraints:

- max 6 active recommendations per refresh
- dedupe by stable advisory intent
- grounded in evidence only
- no vague “optimize performance” language
- no direct approval or execution copy

## Evidence and Expected Outcome

Every recommendation now includes:

- `rationale`
- `evidence[]`
- `expectedOutcome`

This gives operators:

- the advisory statement
- the supporting facts
- the intended business result of following the guidance

## Ranking Model

Recommendations are ordered by:

1. urgency
2. confidence
3. freshness of source signals
4. title tie-break

Ranking intent:

- stale or low-confidence recommendations fall behind fresher, higher-confidence advice
- recommendations based on revenue, payments, or sync-risk issues surface first when urgency is higher
- advisory noise is reduced by collapsing overlapping guidance into a single recommendation per intent

## API Contract

Canonical endpoints:

- `GET /api/v1/intelligence/recommendations`
- `GET /api/v1/intelligence/recommendations/:id`
- `POST /api/v1/intelligence/recommendations/refresh`

Compatibility endpoints retained:

- `GET /api/v1/ai/recommendations`
- `GET /api/v1/ai/recommendations/:id`
- `POST /api/v1/ai/recommendations/generate`
- `POST /api/v1/ai/recommendations/refresh`

Supported filters:

- `organizationId`
- `type`
- `urgency`
- `affectedArea`
- `confidence`
- `status`

## UI Contract

The Opportunities surface now shows:

- title
- summary
- urgency
- affected area
- confidence
- rationale
- evidence preview
- expected outcome

It also supports:

- urgency filter
- affected-area filter
- confidence filter

UI behavior:

- advisory tone only
- clear separation from actions
- evidence-first rendering
- empty states distinguish between “nothing active” and “data is limited”

## Product Dependencies

Canonical recommendations now feed:

- Overview opportunity surfaces
- Overview `Needs Attention`
- Daily Brief advisory/action suggestions
- recommendation-to-action proposal creation
- executive-facing opportunity review pages

This reduces duplicated recommendation logic in downstream product surfaces and keeps advisory wording aligned with the canonical intelligence layer.
