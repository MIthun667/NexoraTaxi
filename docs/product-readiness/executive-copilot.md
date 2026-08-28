# Executive Copilot

## Response Contract

`ExecutiveCopilotResponse`

- `organizationId`
- `generatedAt`
- `trust`
- `topSummary`
- `keySignals[]`
- `keyRecommendations[]`
- `pendingActions[]`
- `agentHighlights[]`
- `learningHighlights`
- `connectedStoreStatus`
- `executiveFocus[]`

## Section Definitions

- `trust`
  - Canonical data trust state from `AiDataTrustService`
- `topSummary`
  - Deterministic leadership-ready summary
  - Includes `summary`, `whatChanged`, and `whatMatters`
- `keySignals`
  - Top canonical signals already ranked by severity, freshness, and impact
- `keyRecommendations`
  - Top advisory items from the recommendations layer
- `pendingActions`
  - Bounded proposals or failed/pending executions needing review
- `agentHighlights`
  - Recent governed commerce agent outputs
- `learningHighlights`
  - Simple approval and action outcome summary from the learning loop
- `connectedStoreStatus`
  - Primary store connectivity summary
- `executiveFocus`
  - 3-5 concise leadership focus bullets

## Summary Generation Rules

- Deterministic first
- Never invent facts beyond trust, brief, signals, recommendations, proposals, executions, learning, and recent agent runs
- Mention trust limitations when material
- Prefer a short summary plus explicit `what changed` and `what matters` lines
- Fallbacks:
  - Store not connected: `Connect your store to enable executive insights.`
  - First sync incomplete: `Executive insights will become available once initial data is collected.`

## Executive Focus Rules

- Maximum 5 items
- Built from canonical trust warnings, pending actions, top recommendations, signal next steps, and recent agent concerns
- Must be concrete and commercially meaningful

## Agent Highlight Rules

- Pull only from recent governed commerce agent runs
- Surface:
  - `agentName`
  - `triggerType`
  - `triggerReason`
  - `summary`
  - `topConcern`
  - run timing
- Do not expose full raw agent payloads in the executive surface

## Learning Highlight Rules

- Phase 1 remains lightweight and deterministic
- Expose only:
  - tracked action count
  - positive outcome rate
  - operator approval rate
- Do not overstate causality or predictive power

## API Contract

Canonical:

- `GET /api/v1/intelligence/executive-copilot`
- `POST /api/v1/intelligence/executive-copilot/refresh`

Compatibility:

- `GET /api/v1/ai/executive-copilot`
- `POST /api/v1/ai/executive-copilot/refresh`

## Frontend Surface Contract

Primary route:

- `/shopify/executive-brief`

Layout:

- Top:
  - trust panel
  - executive summary
  - store summary
- Middle:
  - key signals
  - key recommendations
- Lower:
  - pending actions
  - learning highlights
  - agent highlights

## Relationship To Overview

- `Overview` remains the operational command surface
- `Executive Copilot` is the leadership briefing surface
- Both consume the same canonical trust, signals, recommendations, proposals, and connected store contracts

## First-Version Limitations

- No separate executive history timeline yet
- Agent highlights are concise rather than full run analytics
- Learning remains deterministic and descriptive, not predictive
