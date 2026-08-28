# Operations Task Foundation

## Purpose of the Operational Task abstraction

The Operational Task abstraction gives the platform a universal read model for coordinated units of work while seeded taxi-era dispatch records still exist underneath the system.

This allows backend consumers to speak in task-oriented language now without removing or breaking the existing dispatch module.

## Mapping of dispatch-era concepts to OperationalTask

Current source:

- `apps/api/src/modules/dispatch`

Current read path used:

- `DispatchService.listRuns()`
- `DispatchService.getRun()`

Current normalization:

- `id` -> `dispatchRun.id`
- `organizationId` -> `dispatchRun.organizationId`
- `displayName` -> `dispatchRun.runCode`
- `taskType` -> normalized to `dispatch-run`
- `status` -> `dispatchRun.dispatchStatus`
- `sourceModule` -> `dispatch`
- `relatedAssignmentId` -> `dispatchRun.assignmentId`
- `zoneId` -> `dispatchRun.zoneId`
- `createdAt` -> `dispatchRun.createdAt`

## Confirmation that seeded data is used

The new operational task read abstraction does not create fake records or bypass the live data layer.

It reads seeded dispatch-era task data through the existing dispatch service:

- seeded dispatch runs now appear through `GET /operations/tasks`
- seeded dispatch runs now appear through `GET /operations/tasks/:id`

## What was intentionally not changed

- No Prisma schema changes
- No seed changes
- No removal of the `dispatch` module
- No renaming of dispatch DTOs or dispatch routes
- No write-path migration from dispatch to universal operations
- No attempt yet to absorb dispatch assignments, incidents, or shifts into the same task abstraction

## Next refactor step

The next safe step is to move more dashboard and AI read-side consumers from dispatch-run vocabulary to `OperationalTask`, and then expand the universal read layer to relate tasks with universal assignments, incidents, and schedules.
