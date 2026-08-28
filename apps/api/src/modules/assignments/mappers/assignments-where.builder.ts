import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { ListResourceAssignmentsQueryDto } from '../dto/list-resource-assignments-query.dto';

export function buildAssignmentsWhere(
  query: ListResourceAssignmentsQueryDto,
  principal?: CurrentPrincipal,
): Prisma.ResourceAssignmentWhereInput {
  const organizationId = query.organizationId ?? principal?.organizationId;

  return {
    ...(organizationId ? { organizationId } : {}),
    ...(query.assignmentType ? { assignmentType: query.assignmentType } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.workforceMemberId ? { workforceMemberId: query.workforceMemberId } : {}),
    ...(query.assetId ? { assetId: query.assetId } : {}),
    ...(query.shiftId ? { shiftId: query.shiftId } : {}),
    ...(query.workOrderId ? { workOrderId: query.workOrderId } : {}),
    ...(query.zoneId ? { zoneId: query.zoneId } : {}),
    ...(query.assignedByUserId ? { assignedByUserId: query.assignedByUserId } : {}),
    ...(query.assignedAtFrom || query.assignedAtTo
      ? {
          assignedAt: {
            ...(query.assignedAtFrom ? { gte: new Date(query.assignedAtFrom) } : {}),
            ...(query.assignedAtTo ? { lte: new Date(query.assignedAtTo) } : {}),
          },
        }
      : {}),
    ...(query.releasedAtFrom || query.releasedAtTo
      ? {
          releasedAt: {
            ...(query.releasedAtFrom ? { gte: new Date(query.releasedAtFrom) } : {}),
            ...(query.releasedAtTo ? { lte: new Date(query.releasedAtTo) } : {}),
          },
        }
      : {}),
  };
}
