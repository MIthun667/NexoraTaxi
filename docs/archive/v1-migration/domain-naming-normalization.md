# Domain Naming Normalization

## Purpose of naming normalization

The platform is in a mixed state: universal enterprise modules already exist, but taxi-era vocabulary is still present in routes, DTOs, controllers, Prisma models, and internal service logic.

This normalization layer provides a controlled compatibility registry so the codebase can move toward universal business language without breaking seeded-data-backed flows or existing API contracts.

## Current legacy vocabulary still present

| Legacy vocabulary | Current backend exposure |
|---|---|
| `driver` | controllers, DTOs, service names, Prisma models, compatibility abstractions |
| `operator` | controller aliases, permission names, response messages |
| `fleet` / `fleet vehicle` | controllers, DTOs, service names, Prisma models |
| `dispatch` | controllers, DTOs, service names, Prisma models |
| `dispatch run` | service methods and mappers; now projected by the Operational Task abstraction |
| `driver vehicle assignment` | DTO and service naming in dispatch |

## Preferred universal vocabulary

| Legacy term | Preferred universal vocabulary |
|---|---|
| `driver` | `person` / `workforce member` |
| `driver status` | `person status` / `workforce status` |
| `fleet vehicle` | `asset` |
| `fleet maintenance` | `asset maintenance` |
| `dispatch` | `operations` / `operational task coordination` |
| `dispatch run` | `operational task` |
| `trip / job / run` | `operational task` |
| `driver vehicle assignment` | `assignment` / `resource assignment` |
| `operator` | `person` / `worker` |

## What was normalized in this prompt

### Shared code registry

A shared naming registry/helper was added under:

- `apps/api/src/common/naming/domain-term-map.ts`
- `apps/api/src/common/naming/domain-term-normalization.util.ts`
- `apps/api/src/common/naming/index.ts`

This codifies:

- legacy term
- preferred universal term
- context notes
- whether the legacy term is still externally exposed

### Safe non-breaking backend improvements

The following safe, non-breaking changes were added:

- TODO comments in:
  - `people.service.ts`
  - `assets.service.ts`
  - `operations.service.ts`
- compatibility comments in legacy controllers:
  - `drivers.controller.ts`
  - `fleet.controller.ts`
  - `dispatch.controller.ts`

These changes clarify migration intent without changing routes, DTO keys, schema names, or seeded data behavior.

## What was intentionally left unchanged to preserve compatibility

- No route path changes
- No DTO class renames
- No response key renames
- No Prisma model renames
- No module folder renames
- No seed changes
- No schema changes
- No controller/service contract changes

## Compatibility surface

### Backend internal names

- Still mixed between universal and taxi-era terms
- A shared registry now documents the preferred direction for future refactors

### API route names

- Still expose taxi-era paths and aliases such as:
  - `drivers`
  - `fleet`
  - `dispatch`
- Left unchanged intentionally for backward compatibility

### DTO / response vocabulary

- Taxi-era DTOs remain in:
  - `drivers`
  - `fleet`
  - `dispatch`
- Universal abstractions now exist in:
  - `people`
  - `assets`
  - `operations` task projection

### Prisma / schema vocabulary

- Taxi-era Prisma models remain unchanged in this prompt
- Universal naming is only scaffolded at the code/comment/helper level here

### Frontend risk notes

Based on backend contracts, frontend consumers are still likely coupled to taxi-era route and DTO language wherever they use:

- `drivers`
- `fleet`
- `dispatch`
- dashboard aliases such as dispatch/fleet/drivers summaries

## Recommended future rename order

1. Standardize internal read abstractions first
   - `people`
   - `assets`
   - `operational task`

2. Migrate dashboard and AI read-side consumers to the universal abstractions

3. Introduce compatibility adapters where taxi DTOs still need to be served

4. Deprecate taxi-era route families after universal routes are the documented default

5. Rename DTOs and internal service terms

6. Only after that, plan schema-level renames or legacy model removal
