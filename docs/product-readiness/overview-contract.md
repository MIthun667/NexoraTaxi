# Overview Contract

## Objective

The Overview page is the executive command surface for Nexora Commerce. It should help an operator understand what is happening, what changed, what needs attention, and what to do next within a few seconds.

## Hierarchy Rules

1. `Daily Brief` is the dominant surface.
2. `Needs Attention` is the primary action layer.
3. `Key Metrics` provides secondary operating context.
4. `Store Connection` is supporting information.
5. `System Status` appears first visually, but functions as a compact trust bar rather than the dominant content block.

## Section Definitions

### 1. System Status

Purpose:

- show whether the store is healthy enough to trust the page
- make data freshness and coverage readable at a glance

Contents:

- system status
- data freshness
- coverage
- Stripe status

Data dependencies:

- `useShopifyConnectionStatus`
- `useStripeStatus`

Fallback behavior:

- if no store is connected, system status shows an issue state
- if no sync has completed, freshness shows stale
- if access is partial, coverage shows limited
- if Stripe is not connected, Stripe status shows not connected

### 2. Daily Brief

Purpose:

- provide the clearest summary of what changed and what should happen next

Contents:

- short executive summary
- key signals
- key risks
- recommended actions

Data dependencies:

- `useShopifySummary`
- `useShopifyExecutiveSummary`
- `useShopifySignals`
- `useShopifyRecommendations`

Fallback behavior:

- if an executive summary exists, it is displayed as the primary narrative
- if an executive summary is unavailable, the brief falls back to deterministic summary text based on verified metrics and active signals
- if data is limited, the brief explicitly says coverage is partial
- if there are no significant signals, the brief explicitly says so

### 3. Needs Attention

Purpose:

- show the urgent issues and review items that need action now

Contents:

- high-severity signals
- urgent opportunities
- pending or in-review actions

Data dependencies:

- `useShopifySignals`
- `useShopifyRecommendations`
- `useShopifyActionProposals`

Fallback behavior:

- if none are active, show `No significant signals detected`
- if only one category has items, the section still renders with that category alone

### 4. Key Metrics

Purpose:

- provide clean context after the brief and attention layer

Contents:

- revenue today
- orders today
- new customers
- critical signals

Data dependencies:

- `useShopifySummary`

Fallback behavior:

- metric totals always reflect verified summary values only
- if comparative context is unavailable, the cards state that no verified prior comparison is available yet

### 5. Store Connection

Purpose:

- provide supporting detail about store linkage and last sync state

Contents:

- connection state
- store domain
- connection description
- installed timestamp
- latest sync timestamp

Data dependencies:

- `useShopifyConnectionStatus`

Fallback behavior:

- if no store is connected, instruct the user to connect a store
- if coverage is limited, explain that order and customer visibility is still restricted

## Removed from Overview

- Stripe finance summary card
- customer intelligence card
- stand-alone recommendation widget
- stand-alone signal widget
- stand-alone proposal list as a separate terminal section
- the old widget-first KPI strip placement

These capabilities still exist elsewhere in the product, but they no longer compete with the executive command flow on Overview.

## Empty and Degraded States

### Not connected

- `Connect your store to start receiving insights`

### Still syncing

- data status and the daily brief explain that syncing is still in progress

### Partial sync

- system status shows limited coverage
- daily brief states that some order or customer visibility is still restricted

### No significant issues

- needs attention shows `No significant signals detected`

## File Ownership

- `apps/web/src/modules/shopify/components/shopify-overview-screen.tsx`
- `apps/web/src/modules/shopify/components/overview-system-status-bar.tsx`
- `apps/web/src/modules/shopify/components/overview-daily-brief-panel.tsx`
- `apps/web/src/modules/shopify/components/overview-needs-attention.tsx`
- `apps/web/src/modules/shopify/components/overview-key-metrics.tsx`
