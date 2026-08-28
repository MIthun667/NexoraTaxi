# Budget Variance / Spend Deviation Signal

## Purpose

This foundation adds the second concrete anomaly detector on top of the shared `Signal` and anomaly-detection contracts. It introduces a practical spend-oriented signal without requiring a dedicated finance schema.

## Seeded Data Source Used

The detector uses existing seeded data from:

- `asset_maintenance_record`

Concretely, it reads:

- recent maintenance records from `AssetsRepository.listMaintenanceRecordsForOrganization(...)`
- `costAmount`
- `currencyCode`
- maintenance status, type, vendor, and asset references

## Why This Data Source Was Chosen

The current platform does not yet expose a full budgeting, invoice, payout, or expense ledger. The closest grounded cost-bearing dataset already present in the seeded environment is **asset maintenance spend**.

That makes maintenance records the best current cost-adjacent proxy for a first budget/spend anomaly signal because they:

- already carry real numeric `costAmount` values
- are seeded over time
- are operationally meaningful
- connect spend to specific assets and maintenance work

## Anomaly Rule Implemented

The detector evaluates recent maintenance records within a rolling 21-day baseline window.

For those records, it calculates:

- recent average maintenance cost
- deviation threshold = `recentAverageCost * 1.5`
- critical threshold = `recentAverageCost * 2`

It emits a signal when:

- a maintenance record has a non-null `costAmount`
- that cost is greater than or equal to the deviation threshold

Severity is intentionally simple:

- `HIGH` when record cost >= 2x recent average
- `MEDIUM` when record cost >= 1.5x recent average

## Canonical Signal Shape Produced

The detector emits canonical `Signal` objects with:

- `signalType = assets.maintenance.spend_deviation_detected`
- `signalCategory = assets`
- `sourceModule = intelligence`
- `sourceSystem = anomaly-detector`
- `entityType = asset-maintenance-record`
- `entityId = maintenanceRecord.id`
- `relatedEntityIds = [assetId]` where available
- `organizationId`
- `title`
- `summary`
- `severity`
- `status = OPEN`
- `evidence`
- `metrics`
- `metadata`

## Signal Registry Integration

The detector is registered through `SignalRegistryService` with:

- `key = assets.budget-variance-anomaly`
- `category = assets`
- `supportsTenantScoping = true`

This keeps spend-oriented anomaly detection discoverable through the same shared registry as other signal producers.

## What Was Safely Introduced

- one concrete detector:
  - `BudgetVarianceAnomalyDetector`
- one minimal repository read helper:
  - `AssetsRepository.listMaintenanceRecordsForOrganization(...)`
- one registry registration
- one small internal intelligence hook:
  - `IntelligenceService.collectBudgetVarianceAnomalySignals(organizationId)`

No routes, schema, seeds, or existing operational behavior were changed.

## What Was Intentionally Left Unchanged

- no budgeting table was added
- no finance module was introduced
- no approval or workflow behavior was changed
- no dashboard endpoints were changed
- no anomaly orchestration engine was added
- no seasonal or cost-center aware analysis was introduced

## Limitations

This detector is intentionally pragmatic.

Current limitations:

- it uses maintenance spend as a proxy for budget/spend deviation
- it does not compare against explicit budget targets
- it does not segment by cost center, department, or zone
- it does not account for approved exceptional spend
- it does not use seasonal or long-horizon baselines
- it evaluates record-level spend spikes rather than full financial rollups

## Recommended Next Signal To Build

The next strong concrete detector is:

- **stalled workflow / approval bottleneck anomaly**

Why:

- it is grounded in current workflow and approval data
- it complements spend visibility with execution-governance visibility
- it is highly relevant to AI, operational, and executive command surfaces
