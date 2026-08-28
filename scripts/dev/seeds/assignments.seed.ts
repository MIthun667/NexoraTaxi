import { Prisma, AssignmentType, ResourceAssignmentStatus } from '@prisma/client';

import { deterministicUuid } from '../seed/utils';
import { ASSIGNMENT_TARGET, addDays } from './helpers';
import type { AssignmentSeedResult, CoreSeedContext } from './types';

export const seedAssignments = async (
  context: CoreSeedContext & {
    workforceIds: string[];
    assetIds: string[];
    shiftIds: string[];
    shiftCapacities: Array<{ id: string; required: number; allocated?: number | null }>;
    workOrderIds: string[];
    zoneIds: string[];
  },
): Promise<AssignmentSeedResult> => {
  const {
    prisma,
    organizationId,
    users,
    workforceIds,
    assetIds,
    shiftIds,
    shiftCapacities,
    workOrderIds,
    zoneIds,
    now,
  } = context;

  const assignments = Array.from({ length: ASSIGNMENT_TARGET }, (_, index) => {
    let assignmentType: AssignmentType;
    if (index < 40) {
      assignmentType = AssignmentType.WORKFORCE_TO_SHIFT;
    } else if (index < 65) {
      assignmentType = AssignmentType.WORKFORCE_TO_WORKORDER;
    } else if (index < 85) {
      assignmentType = AssignmentType.ASSET_TO_WORKORDER;
    } else if (index < 100) {
      assignmentType = AssignmentType.WORKFORCE_TO_ASSET;
    } else {
      assignmentType = AssignmentType.ASSET_TO_SHIFT;
    }

    const shiftId = assignmentType === AssignmentType.WORKFORCE_TO_SHIFT || assignmentType === AssignmentType.ASSET_TO_SHIFT
      ? shiftIds[index % shiftIds.length] ?? null
      : null;
    const workOrderId = assignmentType === AssignmentType.WORKFORCE_TO_WORKORDER || assignmentType === AssignmentType.ASSET_TO_WORKORDER
      ? workOrderIds[index % workOrderIds.length] ?? null
      : null;
    const zoneId = zoneIds[index % zoneIds.length] ?? null;

    return {
      id: deterministicUuid(`resource-assignment:${index + 1}`),
      organizationId,
      assignmentType,
      status:
        index % 9 === 0
          ? ResourceAssignmentStatus.RELEASED
          : index % 7 === 0
            ? ResourceAssignmentStatus.PLANNED
            : index % 13 === 0
              ? ResourceAssignmentStatus.SUSPENDED
              : ResourceAssignmentStatus.ACTIVE,
      workforceMemberId:
        assignmentType === AssignmentType.ASSET_TO_WORKORDER || assignmentType === AssignmentType.ASSET_TO_SHIFT
          ? null
          : workforceIds[index % workforceIds.length] ?? null,
      assetId:
        assignmentType === AssignmentType.WORKFORCE_TO_SHIFT || assignmentType === AssignmentType.WORKFORCE_TO_WORKORDER
          ? null
          : assetIds[index % assetIds.length] ?? null,
      shiftId,
      workOrderId,
      zoneId,
      assignedByUserId: users[index % users.length]?.id ?? null,
      assignedAt: addDays(now, -(14 - (index % 14))),
      releasedAt: index % 9 === 0 ? addDays(now, -(index % 5)) : null,
      metadata: {
        seeded: true,
        origin: assignmentType === AssignmentType.WORKFORCE_TO_SHIFT ? 'scheduler' : 'dispatch',
      } as Prisma.InputJsonValue,
      createdAt: addDays(now, -(18 - (index % 12))),
      updatedAt: addDays(now, -(index % 4)),
    };
  });

  await prisma.resourceAssignment.createMany({ data: assignments });

  const allocationByShift = new Map<string, number>();
  for (const assignment of assignments) {
    if (
      assignment.assignmentType === AssignmentType.WORKFORCE_TO_SHIFT &&
      assignment.shiftId &&
      assignment.status !== ResourceAssignmentStatus.RELEASED
    ) {
      allocationByShift.set(assignment.shiftId, (allocationByShift.get(assignment.shiftId) ?? 0) + 1);
    }
  }

  await Promise.all(
    shiftCapacities.map((shift) =>
      prisma.scheduleShift.update({
        where: { id: shift.id },
        data: {
          capacityAllocated: allocationByShift.get(shift.id) ?? shift.allocated ?? 0,
        },
      }),
    ),
  );

  return { assignments };
};
