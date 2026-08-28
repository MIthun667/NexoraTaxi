import { Prisma } from '@prisma/client';

import { deterministicUuid } from '../seed/utils';
import {
  MAINTENANCE_TARGET,
  addDays,
  maintenanceStatuses,
  maintenanceTypes,
  priorities,
  toCurrencyAmount,
} from './helpers';
import type { CoreSeedContext, MaintenanceSeedResult } from './types';

export const seedAssetMaintenance = async (
  context: CoreSeedContext & { assetIds: string[]; workforceIds: string[] },
): Promise<MaintenanceSeedResult> => {
  const { prisma, organizationId, assetIds, workforceIds, now } = context;

  const records = Array.from({ length: MAINTENANCE_TARGET }, (_, index) => {
    const scheduledAt = addDays(now, -(10 - (index % 16)));
    const status = maintenanceStatuses[index % maintenanceStatuses.length];
    const startedAt = status === 'IN_PROGRESS' || status === 'COMPLETED' ? addDays(scheduledAt, 1) : null;
    const completedAt = status === 'COMPLETED' ? addDays(startedAt ?? scheduledAt, 2) : null;

    return {
      id: deterministicUuid(`asset-maintenance:${index + 1}`),
      organizationId,
      assetId: assetIds[index % assetIds.length] ?? assetIds[0],
      maintenanceType: maintenanceTypes[index % maintenanceTypes.length],
      title: `${maintenanceTypes[index % maintenanceTypes.length].replace(/_/g, ' ')} maintenance ${index + 1}`,
      description: 'Seeded maintenance workload to support asset readiness and backlog dashboards.',
      status,
      priority: priorities[index % priorities.length],
      scheduledAt,
      startedAt,
      completedAt,
      performedByWorkforceMemberId: workforceIds[index % workforceIds.length] ?? null,
      vendorName: ['Atlas Service', 'Rapid Fleet Care', 'Internal Workshop'][index % 3],
      costAmount: toCurrencyAmount(index),
      currencyCode: 'USD',
      metadata: {
        seeded: true,
        maintenanceWindow: index % 2 === 0 ? 'overnight' : 'daytime',
      } as Prisma.InputJsonValue,
      createdAt: addDays(now, -(20 - (index % 10))),
      updatedAt: addDays(now, -(index % 6)),
    };
  });

  await prisma.assetMaintenanceRecord.createMany({ data: records });

  return { maintenanceRecords: records.length };
};
