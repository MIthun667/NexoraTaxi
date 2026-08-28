# Executive Conversational Q&A

## Q&A Contract

`ExecutiveAnswerResponse`

- `answer`
- `confidence`
- `trustState`
- `sources[]`
- `supportingSignals[]`
- `supportingRecommendations[]`
- `supportingActions[]`
- `supportingAgentRuns[]`
- `limitations[]`
- `suggestedFollowUps[]`
- `generatedAt`

## Supported Question Categories

- `business_summary`
- `trust_and_visibility`
- `signals`
- `recommendations`
- `pending_actions`
- `agents`
- `learning`
- `integrations`
- `performance_change`
- `what_should_i_do`

Unsupported questions return a bounded scope response instead of guessing.

## Deterministic Routing Rules

- Pattern-based intent routing only in phase 1
- No open-ended tool or model routing
- Revenue, order, customer, decline, spike, and pressure language route to `performance_change`
- Trust, freshness, coverage, and visibility route to `trust_and_visibility`
- Approval and review language route to `pending_actions`

## Answer Generation Rules

- Deterministic first
- Reuse:
  - Data Trust
  - Executive Copilot
  - Signals
  - Recommendations
  - Pending actions
  - Agent highlights
  - Learning summary
- Keep answers concise and executive-friendly
- Never invent causal claims beyond current canonical evidence

## Trust And Confidence Rules

- `healthy` trust can support direct answers
- `limited` trust downgrades high confidence to medium
- `issue_detected` trust downgrades answers further and surfaces limitations prominently
- `not_connected` returns low-confidence bounded responses

## API Contract

Canonical:

- `POST /api/v1/intelligence/executive-qa/ask`
- `GET /api/v1/intelligence/executive-qa/suggestions`

Compatibility:

- `POST /api/v1/ai/executive-qa/ask`
- `GET /api/v1/ai/executive-qa/suggestions`

## Frontend Panel Contract

- Compact ask input
- Starter prompt chips
- Single answer card
- Trust/confidence indicators
- Limitations list
- Source references
- Follow-up suggestions

This is intentionally not a full chat transcript surface in phase 1.

## Scope Boundaries And Guardrails

- The system answers only within current executive briefing scope
- No unsupported extrapolation
- No generic chatbot behavior
- No trust-blind answers
- LLM is optional wording refinement only and cannot add facts
