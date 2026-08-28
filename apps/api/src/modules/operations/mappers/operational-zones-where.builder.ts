import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { ListOperationalZonesQueryDto } from '../dto/list-operational-zones-query.dto';

export function buildOperationalZonesWhere(
  query: ListOperationalZonesQueryDto,
  principal?: CurrentPrincipal,
): Prisma.OperationalZoneWhereInput {
  const search = query.search?.trim();
  const organizationId = query.organizationId ?? principal?.organizationId;

  return {
    ...(organizationId ? { organizationId } : {}),
    ...(query.zoneType ? { zoneType: query.zoneType } : {}),
    ...(query.parentZoneId ? { parentZoneId: query.parentZoneId } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(search
      ? {
          OR: [
            { zoneCode: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}
