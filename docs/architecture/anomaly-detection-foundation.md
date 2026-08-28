# Anomaly Detection Foundation

## Purpose of the anomaly detection base pattern
The platform now has:
- a canonical `Signal` contract
- a `SignalRegistryService` for registering signal producers

The next missing foundation is a reusable anomaly-detection pattern that future domains can extend consistently when they begin producing real findings from seeded operational data.

The anomaly base pattern exists to provide one standard way to:
- evaluate domain conditions
- return zero or more canonical signals
- attach evidence and metrics
- integrate with the Signal Registry without inventing a new per-domain pattern each time

This prompt introduces the reusable foundation only. It does **not** implement concrete business anomaly rules yet.

## Where it lives in the architecture
The anomaly detection foundation was added inside the existing `intelligence` module because it is the natural home for:
- generated operational summaries
- explanation logic
- future reasoning support
- signal orchestration foundations

New files:
- `apps/api/src/modules/intelligence/anomalies.types.ts`
- `apps/api/src/modules/intelligence/base-anomaly-detector.ts`
- `apps/api/src/modules/intelligence/anomalies/noop-anomaly.detector.ts`

The anomaly base integrates directly with the existing `SignalRegistryService`.

## Relationship to Signal and Signal Registry
### Signal
Concrete anomaly detectors will emit `CanonicalSignal[]` using the shared contract under `common/signals`.

### Signal Registry
Concrete anomaly detectors can be registered the same way as other signal producers because the base detector implements the same producer pattern.

This means future anomaly detectors become first-class discoverable signal sources without needing a second registry mechanism.

## Base evaluation flow
The reusable pattern now supports this flow:

1. a detector receives an `AnomalyEvaluationContext`
2. it evaluates seeded-data-aware domain conditions
3. it returns an `AnomalyEvaluationResult`
4. that result contains zero or more canonical signals
5. the detector can attach evidence, metrics, and threshold metadata
6. the detector can be discovered through `SignalRegistryService`

## Base contracts introduced
### `AnomalyEvaluationContext`
Minimal context for anomaly evaluation, including tenant scoping and detector key support.

### `AnomalyThresholdMetadata`
Optional threshold metadata for future detectors that need to explain limits, thresholds, or comparison values.

### `AnomalyEvaluationResult`
Standard result shape containing:
- `signals`
- `evidence`
- `metrics`
- `thresholds`

### `BaseAnomalyDetector`
An abstract base class that:
- implements the signal producer pattern
- exposes `collect(context)`
- provides a reusable `buildSignal(...)` helper
- requires subclasses to implement `evaluate(context)`

This keeps future detectors consistent while staying lightweight.

## What was safely introduced in this prompt
### Shared anomaly foundation
Added reusable anomaly types and a base class under the intelligence module.

### Registry integration
A starter no-op anomaly detector was registered through `SignalRegistryService`.

### Starter scaffold detector
`NoopAnomalyDetector` exists only to demonstrate the extension pattern safely.
It:
- emits no findings
- changes no runtime behavior
- does not rely on fake data
- is clearly marked as scaffolding

## What was intentionally left unchanged
To preserve compatibility, this prompt intentionally did **not** change:
- Prisma schema
- dashboard behavior
- intelligence APIs
- signal persistence
- retrieval behavior
- reports behavior
- seeded data
- existing signal producers

No real anomaly rules or thresholds were added in this step.

## How future anomaly detectors should extend it
Future detectors should:
1. extend `BaseAnomalyDetector`
2. define a stable `key`, category, description, and source module
3. implement `evaluate(context)` using existing seeded-data-aware repositories/services
4. return canonical signals, evidence, and metrics
5. register themselves through `SignalRegistryService`

Examples of future detectors:
- workforce attendance anomaly
- staffing shortage anomaly
- asset downtime anomaly
- stalled workflow anomaly
- approval bottleneck anomaly
- dispatch/operations overload anomaly

## Recommended next step
1. add one real seeded-data-backed detector in a universal domain, such as workforce readiness or workflow blockage
2. adapt dashboard and observability alerts into the same signal/detector discovery model
3. introduce a lightweight orchestrator later, only after a few real detectors exist and the registration pattern is proven
