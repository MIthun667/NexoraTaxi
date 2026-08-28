# Signal Registry Foundation

## Purpose of the Signal Registry
The platform now has a shared `CanonicalSignal` contract, but it still needs one central place to register and discover which parts of the system can produce signals.

The Signal Registry exists to:
- register signal producers in one consistent place
- enumerate available signal sources across the platform
- provide a stable discovery mechanism for future intelligence, monitoring, anomaly detection, dashboard, and agent systems
- avoid hardcoding signal producer discovery into individual modules

This prompt introduces registry infrastructure only. It does **not** implement broad signal orchestration or anomaly generation logic.

## Where the registry lives in the architecture
The registry was added inside the existing `intelligence` module because that module is already the natural home for:
- generated operational summaries
- explanation logic
- future structured intelligence outputs
- AI-assisted reasoning support

New files:
- `apps/api/src/modules/intelligence/signals.types.ts`
- `apps/api/src/modules/intelligence/signal-registry.service.ts`
- `apps/api/src/modules/intelligence/signals/workforce-signal.producer.ts`
- `apps/api/src/modules/intelligence/signals/operations-signal.producer.ts`

The `intelligence` module now exports `SignalRegistryService`.

## Signal producer contract used
A minimal producer contract was introduced in `signals.types.ts`.

### `SignalProducer`
Represents a discoverable signal source.

Fields / capabilities:
- `key`
- `category`
- `description`
- `supportsTenantScoping`
- `sourceModule`
- optional `collect(context)` method for future signal collection

### `SignalProducerRegistration`
A lightweight metadata shape used when listing registered producers.

### `SignalProducerContext`
A minimal future-safe execution context with tenant scoping support.

This contract is intentionally small so producers can register now without forcing execution logic before the platform is ready.

## Registry responsibilities
The registry service currently supports:
- `register(producer)`
- `list()`
- `listByCategory(category)`
- `get(key)`

This is enough to establish a central producer-discovery pattern without introducing orchestration side effects.

## What was wired in this prompt
### Intelligence module wiring
`SignalRegistryService` was added to `IntelligenceModule` providers and exports.

### Starter example registrations
Two minimal, non-invasive starter producers were registered:
- `workforce.readiness`
- `operations.flow`

These are intentionally placeholder registrations only. They advertise capability and category without changing current runtime behavior.

### Internal service access
`IntelligenceService` now exposes:
- `listRegisteredSignalProducers()`

This provides a safe internal integration point without adding new public endpoints in this prompt.

## What was intentionally left unchanged
To preserve compatibility, this prompt intentionally did **not** change:
- Prisma schema
- dashboard APIs
- intelligence APIs
- retrieval behavior
- reports behavior
- triggers behavior
- seeded data
- existing module boundaries outside safe intelligence wiring

No full signal orchestration or anomaly detection was implemented.

## How future signals should integrate with the registry
Future signal producers should:
1. implement the `SignalProducer` contract
2. declare a stable `key`, category, and source module
3. support organization scoping where applicable
4. be registered through `SignalRegistryService`
5. later implement `collect(context)` using real seeded-data-aware read models or repositories

Recommended next integrations:
- dashboard alert producer
- observability alert producer
- retrieval risk-signal producer adapter
- knowledge-graph insight producer adapter
- approval bottleneck producer
- workflow blockage producer

## Future migration guidance
- Keep the registry metadata-first until signal production rules stabilize.
- Add concrete `collect()` implementations only when each domain’s read models are clear and reusable.
- Prefer adapters over rewrites when onboarding existing dashboard, observability, or retrieval signal sources.
