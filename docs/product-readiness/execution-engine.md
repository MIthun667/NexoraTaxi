# Action Execution Engine

Nexora's Action Execution Engine allows the system to transition from an advisory role to a controlled execution system with human-in-the-loop approvals.

## Execution Contract

The canonical `ActionExecution` model tracks the entire lifecycle of an action:

```prisma
model ActionExecution {
  id                String                @id @default(uuid()) @db.Uuid
  proposalId        String?               @db.Uuid
  organizationId    String                @db.Uuid
  type              ActionExecutionType
  status            ActionExecutionStatus @default(PENDING)
  approvalStatus    ActionApprovalStatus  @default(PENDING)
  requestedByUserId String?               @db.Uuid
  approvedByUserId  String?               @db.Uuid
  executedAt        DateTime?
  result            Json?
  error             String?               @db.VarChar(1000)
}
```

### Lifecycle Statuses

- **PENDING**: Action created and ready for execution (if no approval needed).
- **PENDING_APPROVAL**: Action requires human review.
- **APPROVED**: Action has been approved and is ready to run.
- **REJECTED**: Action was denied by an operator.
- **EXECUTING**: Handler is currently running.
- **COMPLETED**: Action finished successfully.
- **FAILED**: Action encountered an error during execution.

## Approval Rules

The system uses deterministic logic to decide if an action requires manual approval:

| Action Type | Risk Level | Approval Required |
|-------------|------------|-------------------|
| RETRY_SHOPIFY_SYNC | Low | No (Auto-approve) |
| RETRY_STRIPE_SYNC | Low | No (Auto-approve) |
| TRIGGER_DATA_REFRESH | Low | No (Auto-approve) |
| RECONNECT_STORE | Medium | Yes |
| ESCALATE_ISSUE | Medium | Yes |
| MARK_RESOLVED | Low | Yes (Manual check) |

## Supported Handlers

1.  **RETRY_SHOPIFY_SYNC**: Triggers a manual sync via the Shopify integration service.
2.  **RETRY_STRIPE_SYNC**: Triggers a manual sync via the Stripe integration service.
3.  **TRIGGER_DATA_REFRESH**: Forces a refresh of signals and recommendations.
4.  **RECONNECT_STORE**: Initiates the store reconnection flow.
5.  **ESCALATE_ISSUE**: Notifies administrative roles about critical issues.
6.  **MARK_RESOLVED**: Updates internal state to reflect issue resolution.

## Safety Guardrails

- **Proposal Validation**: Actions can only be created from valid `ActionProposals`.
- **Idempotency**: Handlers are designed to be safe to retry.
- **Auditability**: Every status change and actor is logged in the `ActionExecutionAudit` table.
- **No Blind Execution**: Risky actions (Medium/High) always block on `PENDING_APPROVAL`.

## API Contract

- `GET /intelligence/actions`: List execution history.
- `POST /intelligence/actions/execute`: Create execution from a proposal.
- `POST /intelligence/actions/:id/approve`: Approve a pending action.
- `POST /intelligence/actions/:id/reject`: Reject a pending action.
- `GET /intelligence/actions/:id`: Get detailed execution and audit trail.
