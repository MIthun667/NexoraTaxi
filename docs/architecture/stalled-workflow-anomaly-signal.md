# Stalled Workflow / Approval Bottleneck Signal

## Purpose

This foundation adds the third concrete anomaly detector on top of the shared `Signal` and anomaly-detection contracts. It introduces a workflow/approval bottleneck detector using real workflow timing fields already present in the platform.

## Seeded Data Source Used

The detector evaluates existing workflow and approval tables:

- `approval_step`
- `workflow_task`

Concretely, it reads:

- overdue pending approval steps via `ApprovalsService.findPendingOverdueStepsForOrganization(...)`
- total pending approval step backlog via `ApprovalsService.countPendingStepsForOrganization(...)`
- overdue open workflow tasks via `WorkflowsService.findOverdueOpenTasksForOrganization(...)`

## Why This Data Source Was Chosen

The platform already has real workflow/approval lifecycle structures with:

- `status`
- `dueAt`
- `createdAt`
- `updatedAt`

Those fields are the strongest grounded basis for a first bottleneck signal because they allow us to detect stalled work without inventing new SLA or escalation models.

## Anomaly Rule Implemented

The detector flags:

- approval steps where:
  - `status = PENDING`
  - `dueAt < now`
- workflow tasks where:
  - `status IN (PENDING, IN_PROGRESS)`
  - `dueAt < now`

Severity is intentionally simple:

- overdue approval step:
  - `HIGH` if overdue by 48+ hours
  - otherwise `MEDIUM`
- overdue workflow task:
  - `HIGH` if `IN_PROGRESS` and overdue by 48+ hours
  - otherwise `MEDIUM`

## Canonical Signal Shape Produced

The detector emits canonical `Signal` objects with:

- approval bottlenecks:
  - `signalType = workflows.approval.bottleneck_detected`
  - `signalCategory = workflows`
  - `entityType = approval-step`
- workflow task bottlenecks:
  - `signalType = workflows.task.stalled_detected`
  - `signalCategory = workflows`
  - `entityType = workflow-task`

Each signal includes:

- `title`
- `summary`
- `severity`
- `organizationId`
- `entityId`
- `relatedEntityIds`
- `evidence`
- `metrics`
- `metadata`

## Signal Registry Integration

The detector is registered in `SignalRegistryService` with:

- `key = workflows.stalled-bottleneck-anomaly`
- `category = workflows`
- `supportsTenantScoping = true`

This allows future orchestration to discover it through the same registry used by the other anomaly detectors.

## What Was Safely Introduced

- one concrete detector:
  - `StalledWorkflowAnomalyDetector`
- small internal read helpers on existing services:
  - `ApprovalsService.findPendingOverdueStepsForOrganization(...)`
  - `ApprovalsService.countPendingStepsForOrganization(...)`
  - `WorkflowsService.findOverdueOpenTasksForOrganization(...)`
- one registry registration
- one small internal intelligence hook:
  - `IntelligenceService.collectStalledWorkflowAnomalySignals(organizationId)`

No routes, schema, seed logic, or existing workflow/approval behavior were changed.

## What Was Intentionally Left Unchanged

- no new workflow schema fields were added
- no SLA engine was introduced
- no escalation prediction was added
- no notification or trigger integration was changed
- no dashboard endpoints were changed
- no orchestration layer was introduced

## Limitations

This detector is intentionally conservative.

Current limitations:

- it depends on `dueAt` being populated to detect overdue work
- it does not yet distinguish by workflow definition or approval type
- it does not model approver workload concentration
- it does not predict future bottlenecks
- the current seeded environment may contain zero workflow/approval records, which means the detector can legitimately return zero findings while still using real data paths

## Recommended Next Signal To Build

The next strong concrete detector is:

- **asset readiness / downtime concentration anomaly**

Why:

- it is grounded in current asset status and maintenance data
- it complements workforce, spend, and process bottleneck visibility
- it would be useful across operational, executive, and AI command surfaces
