# People Module Foundation

## Purpose of the people module

The `people` module introduces a universal read-only abstraction above existing human-actor data without breaking current taxi-era or universal flows. It gives the platform a stable backend concept for "person" while the codebase still contains both `workforce` and `drivers`.

## Definition of the Person abstraction

A `Person` is a normalized human operational actor in the company OS.

Current stable fields:

- `id`
- `organizationId`
- `displayName`
- `roleCategory`
- `status`
- `sourceModule`

This abstraction is intentionally minimal so it can safely represent employees, drivers, operators, managers, and future role-based workers.

## Mapping of workforce -> Person

Current source:

- `apps/api/src/modules/workforce`

Current read path used:

- `WorkforceQueryService.listWorkforceMembers()`
- `WorkforceQueryService.getWorkforceMemberDetail()`

Normalization:

- `id` -> `workforce.id`
- `organizationId` -> `workforce.organizationId`
- `displayName` -> `workforce.displayName ?? firstName + lastName`
- `roleCategory` -> inferred from `workerType`
- `status` -> `workforce.operationalStatus`
- `sourceModule` -> `workforce`

## Mapping of drivers -> Person

Current source:

- `apps/api/src/modules/drivers`

Current read path used:

- `DriversService.findAll()`
- `DriversService.findOne()`

Normalization:

- `id` -> `driver.id`
- `organizationId` -> `driver.organizationId`
- `displayName` -> `firstName + lastName`
- `roleCategory` -> `driver`
- `status` -> `driver.operationalStatus`
- `sourceModule` -> `drivers`

## Confirmation that seeded data is used

The new module does not create, mock, or bypass data.

It reads seeded records through the existing live module services:

- workforce records come from the existing workforce query service
- driver records come from the existing drivers service

That means the people endpoints return the same seeded operational data already available to the platform.

## What was intentionally not changed yet

- No Prisma schema changes
- No seed changes
- No taxi-specific module removal
- No write endpoints for `people`
- No renaming of `drivers`, `workforce`, or related DTOs
- No attempt to merge persistence ownership yet

## Next refactor step

The next safe abstraction step is to move more frontend and dashboard reads to `people` for human-actor list/detail views, while gradually reducing direct dependence on taxi-specific `drivers` routes where universal behavior is now sufficient.
