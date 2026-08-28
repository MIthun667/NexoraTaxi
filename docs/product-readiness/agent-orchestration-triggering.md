# Agent Orchestration And Triggering

## Architecture

Nexora Commerce now has a bounded orchestration layer on top of the existing governed agent runtime.

The orchestration layer:

- records trigger events
- deduplicates noisy triggers
- decides whether a bounded commerce agent should run
- invokes the existing runtime
- stores orchestration metadata on the resulting agent run

It does not:

- invent new agents
- execute unsafe actions
- bypass approval or execution governance

## Trigger Contract

`AgentTriggerEvent` records:

- organization
- agent key
- trigger type
- source
- source id
- reason
- dedupe key
- processed or skipped status
- related agent run
- metadata and errors

Supported trigger types:

- `scheduled`
- `signal_triggered`
- `execution_followup`
- `manual`

Supported sources:

- `scheduler`
- `signal`
- `action_execution`
- `operator`
- `onboarding`

Supported statuses:

- `pending`
- `processed`
- `skipped`
- `failed`

## Trigger Rules By Agent

### `commerce_health_agent`

Triggered by:

- daily scheduled review
- first successful onboarding data completion
- successful data refresh execution follow-up

### `revenue_monitor_agent`

Triggered by:

- `revenue_drop`
- `order_slowdown`
- `demand_spike`
- `unusual_change`

### `customer_momentum_agent`

Triggered by:

- `customer_slowdown`

### `integration_guard_agent`

Triggered by:

- `sync_issue`
- `payment_visibility_gap`
- `data_coverage_limit`
- failed Shopify sync retry execution follow-up
- failed Stripe sync retry execution follow-up

## Scheduled Rules

Phase 1 schedules are explicit in code:

- daily `commerce_health_agent`
  - once per UTC day window
- hourly `integration_guard_agent`
  - only when trust-related signals are still active

The orchestration timer checks every 15 minutes and only emits runs when the current window and dedupe rules allow it.

## Signal And Execution Follow-Up Rules

Signal-triggered orchestration runs only from explicit signal refresh flows and scheduled orchestration passes.

Execution follow-up orchestration runs only when:

- Shopify retry sync fails
- Stripe retry sync fails
- a full data refresh completes successfully

## Dedupe And Cooldown Rules

Phase 1 cooldowns:

- signal-triggered: 2 hours
- execution follow-up: 45 minutes
- manual: 2 minutes
- scheduled: once per schedule window

The layer also skips new runs when a matching commerce agent already has an active `RUNNING` or `WAITING_APPROVAL` run for the same organization.

Skipped triggers are still persisted for auditability.

## API Contract

Canonical routes:

- `GET /api/v1/intelligence/agents`
- `GET /api/v1/intelligence/agents/runs`
- `GET /api/v1/intelligence/agents/runs/:id`
- `GET /api/v1/intelligence/agents/triggers`
- `GET /api/v1/intelligence/agents/triggers/:id`
- `POST /api/v1/intelligence/agents/orchestrate`
- `POST /api/v1/intelligence/agents/:key/run`

Compatibility routes:

- `GET /api/v1/ai/agents`
- `GET /api/v1/ai/agents/runs`
- `GET /api/v1/ai/agents/runs/:id`
- `GET /api/v1/ai/agents/triggers`
- `GET /api/v1/ai/agents/triggers/:id`
- `POST /api/v1/ai/agents/orchestrate`
- `POST /api/v1/ai/agents/:key/run`

## Frontend Visibility

The existing agent run surfaces now show:

- trigger type
- trigger reason
- manual versus automatic context

The detail view also exposes orchestration reason alongside the run summary and structured output.

## Governance And Safety

- orchestration only coordinates bounded existing commerce agents
- orchestration never directly performs unsafe business actions
- any suggested safe execution still flows through the existing execution system
- recommendations and proposals remain explainable and evidence-based
- there are no hidden autonomous loops

## Current Limitations

- signal-triggered orchestration currently runs from explicit signal refresh paths and scheduled passes rather than every passive read path
- the frontend does not yet include a dedicated trigger history page
- the schedule runner is timer-based inside the API process rather than a separate worker or external scheduler
