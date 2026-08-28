import { Prisma, AssetStatusCategory } from '@prisma/client';

import { deterministicUuid } from '../seed/utils';
import {
  ASSET_TARGET,
  DEVICE_CLASSES,
  EQUIPMENT_CLASSES,
  FACILITY_CLASSES,
  VEHICLE_CLASSES,
  TOOL_CLASSES,
  addDays,
  assetAvailabilityStatuses,
  assetComplianceStatuses,
  assetOperationalStatuses,
  assetTypes,
  seededPick,
} from './helpers';
import type { AssetSeedResult, CoreSeedContext } from './types';

const buildAssetClass = (assetType: (typeof assetTypes)[number], index: number): string => {
  switch (assetType) {
    case 'VEHICLE':
      return VEHICLE_CLASSES[index % VEHICLE_CLASSES.length];
    case 'DEVICE':
      return DEVICE_CLASSES[index % DEVICE_CLASSES.length];
    case 'EQUIPMENT':
      return EQUIPMENT_CLASSES[index % EQUIPMENT_CLASSES.length];
    case 'TOOL':
      return TOOL_CLASSES[index % TOOL_CLASSES.length];
    case 'FACILITY':
    case 'ROOM':
      return FACILITY_CLASSES[index % FACILITY_CLASSES.length];
    default:
      return 'General Asset';
  }
};

export const seedAssets = async (
  context: CoreSeedContext & { zoneIds: string[] },
): Promise<AssetSeedResult> => {
  const { prisma, organizationId, zoneIds, users, now } = context;
  const assets = Array.from({ length: ASSET_TARGET }, (_, index) => {
    const assetType = assetTypes[index % assetTypes.length];
    const assetClass = buildAssetClass(assetType, index);
    const assetCode = `AST-${String(index + 1).padStart(4, '0')}`;
    const zoneId = zoneIds[index % zoneIds.length] ?? null;

    return {
      id: deterministicUuid(`asset:${assetCode}`),
      organizationId,
      assetCode,
      assetType,
      assetClass,
      name: `${assetClass} ${index + 1}`,
      serialNumber: `SER-${String(index + 1).padStart(6, '0')}`,
      registrationNumber: assetType === 'VEHICLE' ? `DHK-${2000 + index}` : null,
      operationalStatus: assetOperationalStatuses[index],
      complianceStatus: assetComplianceStatuses[index],
      availabilityStatus: assetAvailabilityStatuses[index],
      zoneId,
      ownerOrganizationId: organizationId,
      specifications: {
        seeded: true,
        vendor: seededPick(['Apex Industrial', 'LogiGrid', 'NexFleet', 'FieldOps'], `asset-vendor:${index}`),
        serviceWindowHours: 8 + (index % 4) * 4,
      } as Prisma.InputJsonValue,
      metadata: {
        seeded: true,
        utilizationBand: ['low', 'steady', 'high'][index % 3],
      } as Prisma.InputJsonValue,
      createdAt: addDays(now, -(180 - index)),
      updatedAt: addDays(now, -(index % 11)),
      deletedAt: null,
    };
  });

  await prisma.asset.createMany({ data: assets });

  const statusHistory = assets.flatMap((asset, index) => {
    const actorId = users[index % users.length]?.id ?? null;
    const baseAt = addDays(now, -(30 - (index % 12)));

    return [
      {
        id: deterministicUuid(`asset-status:${asset.id}:operational`),
        organizationId,
        assetId: asset.id,
        category: AssetStatusCategory.OPERATIONAL_STATUS,
        previousValue: 'PENDING',
        nextValue: asset.operationalStatus,
        reason: 'Seeded operational baseline',
        changedByUserId: actorId,
        effectiveAt: baseAt,
        metadata: { seeded: true } as Prisma.InputJsonValue,
        createdAt: baseAt,
        updatedAt: baseAt,
      },
      {
        id: deterministicUuid(`asset-status:${asset.id}:availability`),
        organizationId,
        assetId: asset.id,
        category: AssetStatusCategory.AVAILABILITY_STATUS,
        previousValue: 'AVAILABLE',
        nextValue: asset.availabilityStatus,
        reason: 'Seeded assignment allocation snapshot',
        changedByUserId: actorId,
        effectiveAt: addDays(baseAt, 1),
        metadata: { seeded: true } as Prisma.InputJsonValue,
        createdAt: addDays(baseAt, 1),
        updatedAt: addDays(baseAt, 1),
      },
    ];
  });

  await prisma.assetStatusHistory.createMany({ data: statusHistory });

  return {
    assets,
    statusHistoryEntries: statusHistory.length,
  };
};
