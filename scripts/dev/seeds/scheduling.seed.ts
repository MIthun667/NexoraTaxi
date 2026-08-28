import { Prisma } from '@prisma/client';

import { deterministicUuid } from '../seed/utils';
import {
  SCHEDULE_PLAN_TARGET,
  SHIFT_TARGET,
  addDays,
  addHours,
  cycleEnum,
  planStatuses,
  planTypes,
  shiftDate,
  shiftStatuses,
  shiftTypes,
} from './helpers';
import type { CoreSeedContext, SchedulingSeedResult } from './types';

export const seedScheduling = async (
  context: CoreSeedContext & { zoneIds: string[] },
): Promise<SchedulingSeedResult> => {
  const { prisma, organizationId, users, zoneIds, now } = context;
  const ownerIds = users.slice(0, 10).map((user) => user.id);

  const plans = Array.from({ length: SCHEDULE_PLAN_TARGET }, (_, index) => {
    const start = shiftDate(index * 7 - 14, 0);
    const end = addDays(start, 6);

    return {
      id: deterministicUuid(`schedule-plan:${index + 1}`),
      organizationId,
      name: `Operational Coverage Plan ${index + 1}`,
      planType: planTypes[index % planTypes.length],
      status: planStatuses[index % planStatuses.length],
      planningWindowStart: start,
      planningWindowEnd: addHours(end, 23),
      ownerUserId: ownerIds[index % ownerIds.length] ?? null,
      metadata: {
        seeded: true,
        planningTheme: ['balanced', 'coverage-push', 'maintenance-heavy'][index % 3],
      } as Prisma.InputJsonValue,
      createdAt: addDays(now, -(60 - index * 3)),
      updatedAt: addDays(now, -(index % 10)),
    };
  });

  await prisma.schedulePlan.createMany({ data: plans });

  const shifts = Array.from({ length: SHIFT_TARGET }, (_, index) => {
    const dayOffset = -5 + Math.floor(index / 5);
    const startHour = [6, 14, 22, 8, 16][index % 5];
    const startsAt = shiftDate(dayOffset, startHour);
    const endsAt = addHours(startsAt, startHour === 22 ? 10 : 8);
    const capacityRequired = 2 + (index % 4);
    const capacityAllocated = Math.max(0, capacityRequired - (index % 3 === 0 ? 1 : index % 7 === 0 ? 2 : 0));

    return {
      id: deterministicUuid(`schedule-shift:${index + 1}`),
      organizationId,
      schedulePlanId: plans[index % plans.length]?.id ?? null,
      shiftCode: `SFT-${String(index + 1).padStart(4, '0')}`,
      shiftType: shiftTypes[index % shiftTypes.length],
      title: `${cycleEnum(['Morning Coverage', 'Field Response', 'Night Coverage', 'Support Window'], index)} ${index + 1}`,
      status: shiftStatuses[index],
      zoneId: zoneIds[index % zoneIds.length] ?? null,
      ownerUserId: ownerIds[(index + 2) % ownerIds.length] ?? null,
      startsAt,
      endsAt,
      capacityRequired,
      capacityAllocated,
      metadata: {
        seeded: true,
        gapLevel: capacityRequired - capacityAllocated,
      } as Prisma.InputJsonValue,
      createdAt: addDays(now, -(20 - (index % 10))),
      updatedAt: addDays(now, -(index % 6)),
    };
  });

  await prisma.scheduleShift.createMany({ data: shifts });

  return { plans, shifts };
};
