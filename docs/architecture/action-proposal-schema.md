# Action Proposal Schema

## Purpose of the canonical action proposal schema
The platform already has several related but separate concepts for deciding and executing work:
- AI-generated `AgentActionProposal` records
- approval requests and approval steps
- workflow tasks and workflow task actions
- action execution requests inside the `actions` module

These pieces are functional, but they do not yet share one canonical proposal contract that future AI agents, approval flows, and automation logic can target consistently.

A canonical Action Proposal schema gives the platform one stable language for:
- describing proposed operational changes before execution
- routing high-risk actions into approval flows
- standardizing AI/rule/workflow/human-assisted recommendation shapes
- gradually replacing taxi-era action vocabulary with universal enterprise language

This prompt introduces shared contracts and normalization scaffolding only. It does **not** change persistence, execution semantics, or approval behavior.

## Current action / approval / workflow patterns found in the codebase

### Existing action proposal source of truth
The codebase already has a real proposal lifecycle centered on:
- `AgentActionProposal` persistence
- `agents/agent-runner.service.ts`
- `actions/action-execution.service.ts`
- `actions/action.types.ts`
- `agents/reasoning/reasoning.types.ts`
- `agents/agent-policy.service.ts`

Observed current pattern:
- reasoning produces `ActionProposalRequest[]`
- `AgentPolicyService.evaluate(...)` applies risk/approval rules
- proposals are stored as `AgentActionProposal`
- `ActionExecutionService.executeProposal(...)` converts the stored proposal into an `ActionExecutionRequest`
- approvals are created when a proposal requires review
- execution status is handled separately from proposal review state

### Existing approval pattern
The approvals module already supports:
- `ApprovalRequest`
- sequenced approval steps
- role/user-based approvers
- event publishing and notifications

This makes approvals the right place to govern high-risk action proposals, but it is not itself the canonical proposal schema.

### Existing workflow pattern
The workflows module manages:
- workflow definitions and instances
- workflow tasks
- workflow task actions

Workflow tasks are actionable work items, but they are not yet normalized into the same proposal schema used by agents and action execution.

### Existing governance / observability pattern
The governance and actions modules already track:
- proposal count
- confidence
- execution status
- blocked actions
- approval-required actions

This means the platform already has the runtime hooks needed for a canonical proposal schema; it just needs a shared contract.

## Canonical action proposal structure
A shared canonical proposal schema was introduced under:
- `apps/api/src/common/actions/action-proposal.interface.ts`
- `apps/api/src/common/actions/action-proposal-category.constants.ts`
- `apps/api/src/common/actions/action-proposal-status.constants.ts`
- `apps/api/src/common/actions/legacy-action-map.ts`
- `apps/api/src/common/actions/action-proposal-normalization.util.ts`

Canonical proposal shape:

| Field | Meaning |
|---|---|
| `proposalId` | proposal identifier if available |
| `proposalType` | original proposal/action type as currently emitted |
| `proposalCategory` | universal business category |
| `title` | short operator-facing title |
| `summary` | concise explanation of the proposal |
| `rationale` | optional reasoning/explanation |
| `sourceModule` | source backend module |
| `sourceSystem` | origin system, e.g. `agent`, `workflow`, `rule-engine`, `human-assisted` |
| `targetEntityType` | target entity kind |
| `targetEntityId` | target entity identifier |
| `organizationId` | tenant boundary |
| `requestedAction` | executable action requested |
| `proposedChanges` | structured change payload |
| `riskLevel` | proposal risk if known |
| `confidence` | confidence score if available |
| `approvalRequired` | whether approval is required |
| `approvalStatus` | normalized approval status |
| `executionStatus` | normalized execution status |
| `createdAt` | proposal creation timestamp |
| `metadata` | compatibility and additional context |

Compatibility rule:
- `proposalType` remains the original action type string
- canonical normalization metadata is layered alongside it

## Action proposal categories
Only categories grounded in the existing architecture were introduced.

| Category | Meaning |
|---|---|
| `people` | workforce, operator, driver, people status, staffing changes |
| `assets` | asset readiness, maintenance, status, vehicle-like resources |
| `operations` | work orders, assignments, incidents, scheduling-impacting operations |
| `workflows` | workflow-task and process-oriented proposals |
| `approvals` | approval escalation or approval-management proposals |
| `compliance` | policy/compliance review actions |
| `notifications` | outbound communication and alerts |
| `system` | fallback category for generic/system proposals |

## Legacy taxi-era action vocabulary mappings
The shared compatibility map codifies legacy taxi-era action terms without changing current behavior.

| Legacy action term | Preferred universal proposal term | Category | Notes |
|---|---|---|---|
| `DRIVER_COMPLIANCE_REVIEW` | `PEOPLE_COMPLIANCE_REVIEW` | `people` | driver-specific compliance review should converge on people/workforce language |
| `SUSPEND_DRIVER` | `SUSPEND_PERSON` | `people` | role-specific suspension should become role-neutral |
| `FLEET_COMPLIANCE_REVIEW` | `ASSET_COMPLIANCE_REVIEW` | `assets` | fleet-specific compliance should converge on assets |
| `BLOCK_FLEET_VEHICLE` | `BLOCK_ASSET` | `assets` | vehicle-specific blocking should converge on assets |
| `ESCALATE_DISPATCH_INCIDENT` | `ESCALATE_OPERATIONAL_INCIDENT` | `operations` | dispatch incident vocabulary should converge on operational incident language |
| `CANCEL_ACTIVE_DISPATCH_RUN` | `CANCEL_OPERATIONAL_TASK` | `operations` | dispatch run vocabulary should converge on operational task language |

## What was safely introduced in this prompt

### Shared contract layer
Added `apps/api/src/common/actions` with:
- canonical proposal interface
- category constants
- normalized approval/execution status constants
- legacy vocabulary map
- proposal builder/normalization helpers

### Minimal integration with the existing actions module
The existing `actions` module was integrated in a non-breaking way:
- `actions/action.types.ts` now exports a `CanonicalActionProposalRecord` alias
- `actions/action-execution.service.ts` now builds a canonical proposal view from the persisted `AgentActionProposal` before creating the existing `ActionExecutionRequest`

This does not change execution behavior. It simply ensures the existing action flow can already project into the new shared contract.

### Focused migration TODO markers
Focused TODO comments were added in `agents/agent-policy.service.ts` for legacy taxi-era action constants that still encode:
- driver-specific language
- fleet-specific language
- dispatch-specific language

## What was intentionally left unchanged
To preserve compatibility, this prompt intentionally did **not** change:
- Prisma schema
- `AgentActionProposal` persistence model
- approval table structure
- workflow task structure
- action execution behavior
- action handler registration
- route names or API shapes
- seeded data

## Recommended next migration step
1. Add canonical proposal adapters for workflow-generated and rule-generated actions so non-agent proposals can share the same contract.
2. Normalize the remaining legacy action constant names in policy/config layers while preserving compatibility aliases.
3. Introduce canonical proposal-aware approval metadata so approvals can display universal business language even when backed by legacy proposal types.
4. Standardize proposal categories across governance, dashboards, and decision reports.
5. Eventually unify persisted proposal records around the canonical contract once schema migration is safe.
