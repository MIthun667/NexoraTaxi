# Signals Hardening

## Signal Contract

The Nexora Commerce Signals layer is now the canonical intelligence substrate for operator review, the Daily Brief, and Action Proposals.

Each signal is normalized to:

```ts
Signal {
  id
  type
  title
  summary
  reason
  severity
  confidence
  freshnessStatus
  affectedArea
  evidence[]
  recommendedNextStep
  createdAt
  updatedAt
}
```

Notes:
- `summary` is the operator-facing one-line statement.
- `reason` explains why the signal exists.
- `evidence[]` is rendered directly in the UI as factual support.
- `recommendedNextStep` keeps the signal actionable without turning it into an autonomous action.
- `description` remains populated in persistence for compatibility, but the product surface should treat `summary` as canonical.

## Signal Taxonomy

Implemented types:

- `revenue_drop`
- `order_slowdown`
- `customer_slowdown`
- `product_concentration_risk`
- `sync_issue`
- `payment_visibility_gap`
- `data_coverage_limit`
- `demand_spike`
- `unusual_change`

Affected areas:

- `revenue`
- `orders`
- `customers`
- `products`
- `integrations`
- `payments`
- `data_quality`

## Generation Rules

Signals are deterministic-first and generated from:

- commerce deltas from `AiCommerceMetricsService`
- customer health metrics from `CrmCustomerIntelligenceService`
- Shopify integration state
- Stripe integration state
- Shopify sync run freshness
- Stripe sync run freshness

Current rules:

- `revenue_drop`
  - generated when revenue change vs previous 24h is `<= -20%`
  - severity escalates at `<= -35%` and `<= -50%`
- `order_slowdown`
  - generated when order change vs previous 24h is `<= -20%`
  - severity escalates at `<= -35%` and `<= -50%`
- `customer_slowdown`
  - generated when customer creation drops materially, no customer activity is seen for `>= 24h`, or retention pressure is above low
- `sync_issue`
  - generated when Shopify sync fails, has no recent successful run, or becomes delayed/stale
- `payment_visibility_gap`
  - generated when Stripe is missing or Stripe sync is failed/stale
- `data_coverage_limit`
  - generated when Shopify protected customer data or coverage is limited
- `product_concentration_risk`
  - generated when the top product exceeds `45%` of tracked 30-day product revenue
  - severity escalates at `65%+`
- `demand_spike`
  - generated when revenue or orders increase `>= +25%` vs previous 24h
- `unusual_change`
  - generated for material payment anomalies such as failure spikes, refunds, disputes, or charge-order alignment gaps

## Ranking Model

Signals are ranked by:

1. severity
2. freshness
3. confidence
4. title tie-break

Severity order:

- `critical`
- `high`
- `medium`
- `low`

Freshness order:

- `fresh`
- `delayed`
- `stale`

Confidence order:

- `high`
- `medium`
- `low`

This keeps critical integration and payment issues at the top while preventing stale low-value signals from crowding the review surface.

## Freshness Lifecycle

Freshness is derived from sync recency and source reliability.

States:

- `fresh`
  - source sync within 6 hours
- `delayed`
  - source sync older than 6 hours but within 24 hours
  - or signal depends on limited coverage
- `stale`
  - source sync failed
  - no recent sync exists
  - or source sync is older than 24 hours

Lifecycle behavior:

- active managed signals are deduplicated by stable `dedupeKey`
- unchanged signal sets are not re-persisted
- changed signal sets replace the current managed set
- stale signals remain visible but are clearly marked

## API Contract

Primary endpoints:

- `GET /api/v1/intelligence/signals`
- `GET /api/v1/intelligence/signals/:id`
- `POST /api/v1/intelligence/signals/refresh`

Compatibility endpoints:

- `GET /api/v1/ai/signals`
- `GET /api/v1/ai/signals/:id`
- `POST /api/v1/ai/signals/refresh`

Supported filters:

- `organizationId`
- `severity`
- `affectedArea`
- `freshnessStatus`
- `type`

## UI Contract

Signals page now shows:

- title
- summary
- severity
- freshness
- affected area
- confidence
- evidence preview
- recommended next step

Filtering supports:

- severity
- affected area
- freshness

Empty and degraded states:

- `No significant signals detected.`
- `Signal generation is limited until store data is current.`
- store-scoped empty state when no single organization is selected

## Dependencies

Canonical Signals now feed:

- Overview `Needs Attention`
- Daily Brief key signals and risks
- Action Proposal generation
- Daily summary severity counts
- Executive summary risk counts
- weekly report signal counts

This removes the older pattern where downstream services reinterpreted legacy signal descriptions independently.
