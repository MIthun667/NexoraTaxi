import { Prisma } from '@prisma/client';

import { deterministicUuid } from '../seed/utils';
import {
  WORK_ORDER_TARGET,
  WORK_ORDER_TYPES,
  addDays,
  addHours,
  cycleEnum,
  priorities,
  workOrderStatuses,
} from './helpers';
import type { CoreSeedContext, WorkOrderSeedResult } from './types';

export const seedWorkOrders = async (
  context: CoreSeedContext & { zoneIds: string[] },
): Promise<WorkOrderSeedResult> => {
  const { prisma, organizationId, users, zoneIds, now } = context;
  const creatorIds = users.slice(0, 18).map((user) => user.id);

  const workOrders = Array.from({ length: WORK_ORDER_TARGET }, (_, index) => {
    const scheduledStartAt = addHours(addDays(now, -(12 - (index % 16))), (index * 3) % 18);
    const status = workOrderStatuses[index];
    const actualStartAt = status === 'ACTIVE' || status === 'COMPLETED' || status === 'FAILED'
      ? addHours(scheduledStartAt, index % 2)
      : null;
    const actualEndAt = status === 'COMPLETED' ? addHours(actualStartAt ?? scheduledStartAt, 4 + (index % 4)) : null;

    return {
      id: deterministicUuid(`work-order:${index + 1}`),
      organizationId,
      workOrderCode: `WO-${String(index + 1).padStart(5, '0')}`,
      title: `${cycleEnum(['Route Recovery', 'Maintenance Dispatch', 'Priority Delivery', 'Coverage Fill', 'Site Inspection'], index)} ${index + 1}`,
      description: `Seeded ${WORK_ORDER_TYPES[index % WORK_ORDER_TYPES.length].toLowerCase().replace(/_/g, ' ')} work order for demo operations visibility.`,
      workType: WORK_ORDER_TYPES[index % WORK_ORDER_TYPES.length],
      status,
      priority: priorities[index % priorities.length],
      zoneId: zoneIds[index % zoneIds.length] ?? null,
      createdByUserId: creatorIds[index % creatorIds.length] ?? null,
      requestedAt: addDays(now, -(20 - (index % 20))),
      scheduledStartAt,
      scheduledEndAt: addHours(scheduledStartAt, 6 + (index % 6)),
      actualStartAt,
      actualEndAt,
      sourceType: index % 4 === 0 ? 'incident' : index % 4 === 1 ? 'schedule' : 'manual',
      sourceId: `SRC-${String(index + 1).padStart(5, '0')}`,
      metadata: {
        seeded: true,
        customerPriority: ['standard', 'priority', 'contract'][index % 3],
      } as Prisma.InputJsonValue,
      createdAt: addDays(now, -(30 - (index % 12))),
      updatedAt: addDays(now, -(index % 5)),
    };
  });

  await prisma.workOrder.createMany({ data: workOrders });

  return { workOrders };
};
