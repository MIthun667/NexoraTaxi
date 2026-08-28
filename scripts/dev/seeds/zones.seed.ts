import { Prisma } from '@prisma/client';

import { deterministicUuid } from '../seed/utils';
import { ZONE_BLUEPRINTS } from './helpers';
import type { CoreSeedContext } from './types';

export const seedOperationalZones = async ({ prisma, organizationId }: CoreSeedContext) => {
  const zones = ZONE_BLUEPRINTS.map((zone, index) => ({
    id: deterministicUuid(`operational-zone:${zone.code}`),
    organizationId,
    zoneCode: zone.code,
    name: zone.name,
    zoneType: zone.type,
    description: `${zone.name} coverage area for seeded operational activity and leadership dashboards.`,
    parentZoneId: zone.parentCode
      ? deterministicUuid(`operational-zone:${zone.parentCode}`)
      : null,
    coverageDefinition: {
      city: 'Dhaka',
      order: index + 1,
      polygonHint: `${zone.code.toLowerCase()}-polygon`,
    } as Prisma.InputJsonValue,
    isActive: true,
    metadata: {
      seeded: true,
      regionGroup: zone.parentCode ?? zone.code,
    } as Prisma.InputJsonValue,
  }));

  await prisma.operationalZone.createMany({ data: zones });

  return zones;
};
