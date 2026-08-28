import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { ListScheduleShiftsQueryDto } from '../dto/list-schedule-shifts-query.dto';

export function buildScheduleShiftsWhere(
  query: ListScheduleShiftsQueryDto,
  principal?: CurrentPrincipal,
): Prisma.ScheduleShiftWhereInput {
  const organizationId = query.organizationId ?? principal?.organizationId;
  const search = query.search?.trim();

  return {
    ...(organizationId ? { organizationId } : {}),
    ...(query.schedulePlanId ? { schedulePlanId: query.schedulePlanId } : {}),
    ...(query.zoneId ? { zoneId: query.zoneId } : {}),
    ...(query.ownerUserId ? { ownerUserId: query.ownerUserId } : {}),
    ...(query.shiftType ? { shiftType: query.shiftType } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.startsFrom || query.endsTo
      ? {
          startsAt: {
            ...(query.startsFrom ? { gte: new Date(query.startsFrom) } : {}),
            ...(query.endsTo ? { lte: new Date(query.endsTo) } : {}),
          },
        }
      : {}),
    ...(query.capacityState === 'OVER_CAPACITY'
      ? {
          capacityAllocated: { gt: 0 },
          NOT: { capacityRequired: null },
        }
      : {}),
    ...(query.capacityState === 'UNDERSTAFFED'
      ? {
          NOT: { capacityRequired: null },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { shiftCode: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}
