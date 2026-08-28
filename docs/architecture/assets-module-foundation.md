# Assets Module Foundation

## Purpose of the assets module

The `assets` module is the universal read abstraction for operational resources in the platform. In the current mixed architecture, seeded operational asset data still lives in the taxi-era `fleet` module, so the `assets` module now reads and normalizes that existing data without removing or breaking fleet behavior.

## Definition of the Asset abstraction

An `Asset` is a normalized operational resource owned or used by an organization.

Current stable fields:

- `id`
- `organizationId`
- `displayName`
- `assetType`
- `status`
- `sourceModule`

This abstraction is intentionally minimal so it can represent fleet vehicles today while remaining compatible with future equipment, devices, facilities, and other enterprise assets.

## Mapping fleet -> Asset

Current source:

- `apps/api/src/modules/fleet`

Current read path used:

- `FleetService.findAllVehicles()`
- `FleetService.findVehicle()`

Normalization:

- `id` -> `fleetVehicle.id`
- `organizationId` -> `fleetVehicle.organizationId`
- `displayName` -> `make + model`
- `assetType` -> normalized to `vehicle`
- `status` -> `fleetVehicle.operationalStatus`
- `sourceModule` -> `fleet`

## Confirmation that seeded data is used

The updated `assets` read path does not create mock records or bypass the platform data layer.

It reads seeded records through the existing live fleet service:

- seeded fleet vehicles now appear through `GET /assets`
- seeded fleet vehicles now appear through `GET /assets/:id`

This keeps the abstraction layer grounded in the real dataset already present in the system.

## What was intentionally not changed

- No Prisma schema changes
- No seed changes
- No removal of the `fleet` module
- No renaming of fleet DTOs or fleet routes
- No write-path migration from fleet to universal asset persistence
- No changes to maintenance or status history routes beyond preserving existing behavior

## Next refactor step

The next safe step is to move more dashboard and AI read-side consumers from fleet-specific vocabulary to the universal `assets` abstraction, while keeping fleet routes as a compatibility surface until universal asset persistence becomes the canonical write model.
