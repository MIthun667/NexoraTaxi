# Agent Layer Foundations

## Architecture

Nexora Commerce now uses a bounded agent layer built on top of the existing trust, intelligence, proposal, execution, and learning systems.

The agent layer is deterministic first:

- agents consume canonical shared services
- agents produce structured observations, evidence, recommendations, and bounded proposals
- agents do not execute unsafe actions directly
- any safe execution suggestion still flows through existing approval and execution controls

## Agent Definitions

The first production agent set is:

- `commerce_health_agent`
  - Domain: `commerce`
  - Focus: overall store health, trust posture, operational concerns
- `revenue_monitor_agent`
  - Domain: `revenue`
  - Focus: revenue and order movement, demand shifts, revenue-related follow-up
- `customer_momentum_agent`
  - Domain: `customers`
  - Focus: customer slowdown, customer momentum, retention follow-up
- `integration_guard_agent`
  - Domain: `integrations`
  - Focus: Shopify and payments health, sync freshness, coverage limitations

## Runtime Design

The runtime is built on the existing `agents` module foundations:

- `agent-registry.service.ts`
  - registers agent definitions
- `agent-runtime.service.ts`
  - handles manual and trigger-based fan-out
- `agent-runner.service.ts`
  - persists runs, observations, decisions, and proposals
- `commerce-agent-context.service.ts`
  - assembles canonical Nexora Commerce context once per run
- agent strategy classes
  - `commerce-health.agent.ts`
  - `revenue-monitor.agent.ts`
  - `customer-momentum.agent.ts`
  - `integration-guard.agent.ts`

## Input Context Contract

Each commerce agent receives a shared serialized context:

- `organizationId`
- `dataTrust`
- `signals`
- `dailyBrief`
- `recommendations`
- `proposals`
- `recentExecutions`
- `learningInsights`
- `connectedStores`
- `overviewMetrics`
- `generatedAt`

This context is snapshot into the run record for auditability.

## Output Contract

Each agent produces:

- `summary`
- `observations[]`
- `recommendations[]`
- `proposals[]`
- `suggestedExecutions[]`
- `confidence`
- `evidence[]`

The runtime maps this output into persisted observations, decisions, and bounded agent proposals.

## Governance Rules

- agents do not autonomously execute unsafe actions
- agents may suggest safe supported execution types such as:
  - `RUN_SHOPIFY_SYNC`
  - `CONNECT_STRIPE`
- agent proposals remain reviewable and policy-evaluated
- agent outputs are explainable through evidence and stored context snapshots
- learning signals can influence confidence and ranking only in bounded deterministic ways

## API Contract

Canonical product-facing routes:

- `GET /api/v1/intelligence/agents`
- `GET /api/v1/intelligence/agents/runs`
- `GET /api/v1/intelligence/agents/runs/:id`
- `POST /api/v1/intelligence/agents/:key/run`

Compatibility routes:

- `GET /api/v1/ai/agents`
- `GET /api/v1/ai/agents/runs`
- `GET /api/v1/ai/agents/runs/:id`
- `POST /api/v1/ai/agents/:key/run`

The older `/api/v1/agents/*` routes remain available for backward compatibility.

## Frontend Surface

The initial UI surface is intentionally lightweight:

- recent commerce agent runs list
- run status, trigger, timing, summary, and proposal counts
- run detail with:
  - summary
  - context snapshot
  - structured output
  - generated proposals
  - trace

## Integration Points

The agent layer reuses:

- Data Trust
- Signals
- Daily Brief
- Recommendations
- Action Proposals
- Execution Engine
- Learning Loop

## Safety And Limitations

Phase 1 limitations:

- no open-ended autonomy
- no autonomous destructive actions
- no direct generation of new business facts outside canonical services
- no full agent cockpit yet
- current agent detail compatibility still reuses existing run observation, decision, and proposal endpoints
