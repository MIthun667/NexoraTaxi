# Attendance Anomaly Signal

## Purpose

This foundation adds the first concrete anomaly detector on top of the shared `Signal` and anomaly-detection contracts. It is intentionally narrow: one workforce presence signal built from existing seeded operational data, without changing runtime behavior elsewhere.

## Seeded Data Source Used

The detector uses existing seeded data from:

- `schedule_shift`
- `resource_assignment`
- workforce readiness summary derived from `workforce`

Concretely, it reads:

- active and near-term scheduled shifts from `ScheduleShiftsRepository`
- assignment counts per shift from `ScheduleShiftsRepository.countAssignments(...)`
- workforce readiness counts from `WorkforceQueryService.getWorkforceReadinessSummary(...)`

## Why This Data Source Was Chosen

The current platform does not expose a dedicated attendance table. The closest grounded substitute already present in the seeded system is **shift coverage against real assignment counts**.

That makes this detector a practical workforce presence signal:

- a scheduled or active shift represents expected worker presence
- assignment counts represent confirmed workforce coverage
- a coverage gap represents a plausible attendance / presence anomaly without inventing unavailable data

## Anomaly Rule Implemented

The detector evaluates:

- shifts with status `ACTIVE`
- shifts with status `SCHEDULED` that start within the recent/upcoming evaluation window

For each shift, it calculates:

- `capacityRequired`
- current assigned worker count
- `coverageGap = capacityRequired - assignedCount`

It emits a signal when:

- `capacityRequired > 0`
- `coverageGap > 0`

Severity is intentionally simple:

- `HIGH` when an active shift has a gap of 2 or more workers
- `MEDIUM` when a scheduled shift has a gap of 2 or more workers
- `LOW` when the gap is 1 worker

## Canonical Signal Shape Produced

The detector emits canonical `Signal` objects with:

- `signalType = people.attendance.coverage_gap_detected`
- `signalCategory = people`
- `sourceModule = intelligence`
- `sourceSystem = anomaly-detector`
- `entityType = schedule-shift`
- `entityId = shift.id`
- `organizationId`
- `title`
- `summary`
- `severity`
- `status = OPEN`
- `evidence`
- `metrics`
- `metadata`

## Signal Registry Integration

The detector is registered through the existing `SignalRegistryService` with:

- `key = people.attendance-anomaly`
- `category = people`
- `supportsTenantScoping = true`

This means future orchestration can discover it through the same registry used for other signal producers.

## What Was Safely Introduced

- one concrete detector:
  - `WorkforceAttendanceAnomalyDetector`
- one registry registration
- one small internal intelligence hook:
  - `IntelligenceService.collectAttendanceAnomalySignals(organizationId)`

No routes, schema, seeds, or existing behaviors were changed.

## What Was Intentionally Left Unchanged

- no attendance persistence model was added
- no dashboard endpoints were changed
- no anomaly orchestration engine was added
- no notifications/triggers/reports were wired to consume this signal yet
- no business-specific baselines or forecasting logic was introduced

## Limitations

This first detector is intentionally conservative.

Current limitations:

- it uses shift coverage as a proxy for attendance/presence
- it does not yet consider leave, approved absences, or team calendars
- it does not compare against historical baselines
- it does not aggregate by department, manager, or zone trend
- it only looks at active and near-term scheduled shifts

## Recommended Next Signal To Build

The next good concrete detector is:

- **stalled workflow / approval bottleneck anomaly**

Why:

- it is grounded in existing workflow and approval data
- it would complement workforce coverage with execution-delay visibility
- it would be valuable for both Operational and Executive command surfaces
