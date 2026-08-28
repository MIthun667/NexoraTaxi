# Data Trust Hardening

## Canonical Trust Contract

`DataTrustStatus`

- `overallStatus`
  - `healthy`
  - `limited`
  - `issue_detected`
  - `not_connected`
- `shopifyStatus`
  - `connected`
  - `limited`
  - `delayed`
  - `stale`
  - `failed`
  - `not_connected`
- `stripeStatus`
  - `connected`
  - `delayed`
  - `stale`
  - `failed`
  - `not_connected`
  - `not_applicable`
- `freshnessStatus`
  - `up_to_date`
  - `delayed`
  - `stale`
- `coverageStatus`
  - `full`
  - `partial`
  - `minimal`
  - `unavailable`
- `limitations[]`
- `evidence[]`
- `recommendedOperatorMessage`
- `updatedAt`
- `integrations.shopify`
  - connection state
  - latest sync status
  - latest successful sync timestamp
  - domain coverage flags
- `integrations.stripe`
  - connection state
  - latest sync status
  - latest successful sync timestamp
  - payment visibility flag

## Thresholds

- `up_to_date`
  - last successful sync within 6 hours
- `delayed`
  - last successful sync older than 6 hours and within 24 hours
- `stale`
  - older than 24 hours
  - failed latest sync
  - no successful sync yet
  - store not connected

## Evidence Model

Evidence is always factual and renderable as short bullets.

Examples:

- `Shopify store northstar.demo is connected.`
- `Shopify sync last succeeded 2 hours ago.`
- `Stripe is connected, but no successful payment sync has been recorded yet.`
- `Products, orders, and customers are currently available.`

## Limitations Model

Limitations explain where operators should be cautious.

Examples:

- `Commerce insights are unavailable until a store is connected.`
- `Trend comparisons may be incomplete until the first successful Shopify sync finishes.`
- `Recent changes may not be fully reflected yet.`
- `Some insights are limited because parts of your store data are not yet available.`
- `Payments-related insights are limited until payments are connected.`

## API Contract

Canonical endpoints:

- `GET /api/v1/intelligence/data-trust`
- `POST /api/v1/intelligence/data-trust/refresh`

Compatibility endpoints:

- `GET /api/v1/ai/data-trust`
- `POST /api/v1/ai/data-trust/refresh`

## Frontend Rendering Contract

Compact trust rendering:

- `System Status`
- `Data Freshness`
- `Coverage`
- `Payments Visibility`

Expanded trust rendering:

- trust summary message
- evidence bullets
- limitation bullets
- last successful Shopify sync
- last successful Stripe sync

## Wording Standards

Approved vocabulary:

- `Up to Date`
- `Delayed`
- `Stale`
- `Limited visibility`
- `Payments visibility is unavailable until Stripe is connected.`
- `Data is current.`
- `Data is delayed. Recent changes may not be fully reflected yet.`
- `Some insights are limited because parts of your store data are not yet available.`
- `Connect your store to enable insights.`
- `Your store is connected, but initial data is still being collected.`

Avoid:

- `partially synced`
- `weak data`
- `old sync state`
- `degraded intelligence mode`
- `incomplete store mode`

## Service Dependencies

Shared trust service:

- `apps/api/src/modules/intelligence/ai-data-trust.service.ts`

Higher-level services now consume shared trust state:

- `apps/api/src/modules/intelligence/ai-daily-brief.service.ts`
- `apps/api/src/modules/intelligence/ai-signal.service.ts`
- `apps/api/src/modules/intelligence/ai-recommendation.service.ts`
- `apps/api/src/modules/intelligence/ai-action-proposal-engine.service.ts`

## UI Surfaces Using Trust

- Overview system status strip
- Daily Brief trust notice
- Signals page trust panel
- Opportunities page trust panel
- Actions page trust panel
- Stores page trust panel
- Data Status page trust panel

## UX Principle

Trust language should reduce overconfidence before it adds polish. If source coverage is partial or freshness is weak, the interface should say so directly before operators act on trends, recommendations, or actions.
