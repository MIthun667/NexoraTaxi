# Scenario Planning + What-If

## Response Contract

`ScenarioAnalysisResponse`

- `organizationId`
- `generatedAt`
- `trust`
- `scenarioType`
- `summary`
- `inputAssumptions[]`
- `expectedEffects[]`
- `risks[]`
- `recommendedMitigations[]`
- `confidence`
- `limitations[]`
- `followUps[]`

## Supported Scenario Types

- `revenue_slowdown_persists`
- `customer_slowdown_persists`
- `sync_issue_persists`
- `payments_visibility_missing`
- `demand_spike_continues`
- `no_action_taken`
- `action_executed`

Phase 1 is intentionally bounded. There is no arbitrary financial modeling, open-ended simulation, or unsupported free-form forecasting.

## Deterministic Rules

- Scenario analysis reuses canonical Data Trust, Executive Copilot, Signals, Recommendations, Action Proposals, Executions, Learning, and Outcome Analytics.
- Effects are directional and operational.
- No unsupported dollar forecasting is generated.
- `no_action_taken` uses the selected proposal when provided, otherwise it falls back to the highest-priority open item.
- `action_executed` only describes bounded likely operational benefit for existing supported execution types.

## Trust and Confidence Rules

- Healthy trust allows more direct scenario language.
- `limited`, `issue_detected`, and `not_connected` trust states downgrade confidence.
- Low action or outcome volume adds explicit directional-only limitations.
- Missing Shopify connectivity returns a clear availability boundary instead of a fabricated scenario.

## Mitigation Rules

- Mitigations are grounded in canonical recommendations, pending actions, and trust limitations.
- The service returns at most 3 to 5 useful mitigations.
- Vague guidance like “optimize performance” is not used.

## API Contract

Canonical:

- `POST /api/v1/intelligence/scenario-planning/analyze`
- `GET /api/v1/intelligence/scenario-planning/options`

Compatibility:

- `POST /api/v1/ai/scenario-planning/analyze`
- `GET /api/v1/ai/scenario-planning/options`

Supported request payload:

```json
{
  "organizationId": "uuid",
  "scenarioType": "revenue_slowdown_persists",
  "proposalId": "optional-uuid",
  "actionExecutionType": "optional-supported-type"
}
```

## Frontend Surface Contract

The first version is a bounded scenario-planning screen:

- scenario selector
- run analysis action
- trust-aware summary
- expected effects
- key risks
- recommended mitigations
- limitations
- follow-up prompts

This is not a free-form sandbox and not a chat transcript interface.

## Relationships

- Executive Copilot can link to scenario planning for deeper directional review.
- Executive Q&A can later reuse the scenario service for bounded what-if follow-ups.
- Outcome Analytics provides the measured-value context that limits overclaiming in scenario outputs.
