# Portfolio Executive View

## Response Contract
- `PortfolioExecutiveResponse`
- `generatedAt`
- `portfolioSummary`
- `organizations`
- `focusList`
- `trustRollup`
- `actionRollup`
- `outcomeRollup`
- `topSignals`
- `limitations`

## Organization Item Contract
- `organizationId`
- `organizationName`
- `overallStatus`
- `trustStatus`
- `topSummary`
- `topSignal`
- `topRecommendation`
- `pendingActionCount`
- `criticalSignalCount`
- `recentOutcomeTrend`
- `connectedStoreSummary`
- `updatedAt`

## Ranking Rules
- `issue_detected` organizations rank ahead of `limited`, `not_connected`, and `healthy`
- critical and high-severity active signals increase rank materially
- pending approvals and failed executions rank above passive backlog
- weakening outcome trends rank above stable or improving trends
- healthy low-activity organizations remain lower in the list

## Summary Rules
- deterministic first
- concise portfolio statement only
- mention attention concentration when trust or action issues exist
- mention action backlog when approvals or failed executions are material
- mention outcome trend only when it is directionally meaningful
- mention one portfolio limitation when trust gaps materially affect interpretation

## Rollup Definitions
- `trustRollup`
  - healthy
  - limited
  - issueDetected
  - notConnected
- `actionRollup`
  - totalPendingProposals
  - totalPendingApprovals
  - failedExecutionsNeedingAttention
- `outcomeRollup`
  - improving
  - stable
  - weakening
  - insufficientData

## API Contract
- `GET /api/v1/intelligence/portfolio-executive`
- `POST /api/v1/intelligence/portfolio-executive/refresh`
- compatibility:
  - `GET /api/v1/ai/portfolio-executive`
  - `POST /api/v1/ai/portfolio-executive/refresh`

Supported filters:
- `status`
- `trustState`
- `attentionOnly`

## Frontend Surface Contract
- top: portfolio summary
- rollup strip: trust, action, outcome
- main list: ranked organization cards
- supporting panels: leadership focus and top cross-org signals
- drill-down is handled by setting active scope and routing to existing single-org surfaces

## Access Control And Scoping
- portfolio aggregation only includes organizations accessible to the current principal
- principals without organization-wide read or manage permissions only see their current organization
- no cross-org details are exposed outside the computed in-scope set
- single-org access returns a simplified portfolio experience instead of a hard failure

## Relationship To Existing Intelligence
- reuses Executive Copilot per organization
- reuses Outcome Analytics per organization
- reuses canonical trust, signals, recommendations, proposals, executions, and connected store status through those services
- does not fork business logic for summaries, trust, or outcome interpretation
