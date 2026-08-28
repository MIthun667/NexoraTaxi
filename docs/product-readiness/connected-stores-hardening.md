# Connected Stores Hardening

## Connected Store Contract

`AiConnectedStoresService` exposes a canonical operator-facing integration status object:

```ts
ConnectedStoreStatus {
  storeId
  storeName
  platform
  connectionStatus
  shopifyStatus
  stripeStatus
  coverageStatus
  lastSuccessfulShopifySyncAt
  lastSuccessfulStripeSyncAt
  latestShopifySyncState
  latestStripeSyncState
  limitations[]
  recommendedNextStep
  actionsAvailable[]
  updatedAt
}
```

This contract supports both compact list rendering and expanded operational cards.

## Integration State Rules

### Connection status

- `connected`
  Shopify is active and the latest store sync does not require attention.
- `connecting`
  The store is connected but an initial sync has not completed yet, or a sync is still running.
- `attention_required`
  The latest Shopify sync is failed or delayed, or payments visibility is stale or failed.
- `not_connected`
  No active Shopify store is available for the organization.

### Latest sync state

- `success`
  Last successful sync completed within the canonical freshness window.
- `in_progress`
  Latest sync is currently running.
- `delayed`
  Last successful sync is older than 6 hours.
- `failed`
  Latest sync failed.
- `never_synced`
  No successful sync has completed yet.
- `not_connected`
  The integration is not connected.

## Wording System

Operator-facing wording is standardized around:

- `Connected`
- `Initial sync in progress`
- `Attention required`
- `Payments not connected`
- `Last synced ...`
- `Some store data is currently limited`
- `Retry sync`
- `Retry payments sync`
- `Connect payments`
- `Review permissions`

Avoided terms:

- connector
- ingestion mode
- degraded intelligence mode
- restricted runtime
- platform state

## API Contract

Canonical endpoints:

- `GET /api/v1/intelligence/connected-stores`
- `GET /api/v1/intelligence/connected-stores/:id`
- `POST /api/v1/intelligence/connected-stores/:id/refresh`
- `POST /api/v1/intelligence/connected-stores/:id/retry-shopify-sync`
- `POST /api/v1/intelligence/connected-stores/:id/retry-stripe-sync`

Compatibility endpoints remain under `/api/v1/ai/connected-stores`.

## UI Contract

### Stores page

The Stores page now acts as the primary integration operations surface.

Each store card shows:

- store name
- platform
- overall connection state
- Shopify state
- payments state
- last successful syncs
- coverage limitations
- recommended next step
- retry or reconnect actions where available

Filters support:

- connection state
- payments visibility state

### Data Status page

The Data Status page now combines:

- shared trust panel
- compact connected store list
- recent Shopify sync history
- payments sync panel

This keeps detailed sync review aligned with the same canonical store status model used elsewhere.

## Relationship To Other Intelligence Layers

- Data Trust remains the canonical source of freshness, coverage, and integration limitations.
- Connected Stores translates trust and sync state into operator-facing store operations status.
- Signals use the same trust and sync foundations for `sync_issue`, `payment_visibility_gap`, and `data_coverage_limit`.
- Recommendations use those same limitations to produce advisory guidance.
- Action Proposals use the same store and sync conditions to generate bounded retry or review actions.

## Recovery Behaviors

- No connected store:
  `Connect your store to start receiving insights.`
- Connected but initial sync pending:
  `Your store is connected. Initial data is still being collected.`
- Shopify sync failed or delayed:
  `Store data needs attention. Retry sync to restore current insights.`
- Stripe not connected:
  `Payments are not connected. Payments insights are unavailable until connected.`
- Partial coverage:
  `Some store data is currently limited.`
