import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { ListWorkforceMembersQueryDto } from '../dto/list-workforce-members-query.dto';

export function buildWorkforceListWhere(
  query: ListWorkforceMembersQueryDto,
  principal?: CurrentPrincipal,
): Prisma.WorkforceMemberWhereInput {
  const search = query.search?.trim();
  const organizationId = query.organizationId ?? principal?.organizationId;

  return {
    deletedAt: null,
    ...(organizationId ? { organizationId } : {}),
    ...(query.workerType ? { workerType: query.workerType } : {}),
    ...(query.departmentId ? { primaryDepartmentId: query.departmentId } : {}),
    ...(query.positionId ? { primaryPositionId: query.positionId } : {}),
    ...(query.zoneId ? { homeZoneId: query.zoneId } : {}),
    ...(query.operationalStatus ? { operationalStatus: query.operationalStatus } : {}),
    ...(query.complianceStatus ? { complianceStatus: query.complianceStatus } : {}),
    ...(query.availabilityStatus ? { availabilityStatus: query.availabilityStatus } : {}),
    ...(search
      ? {
          OR: [
            { workerCode: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
            { workEmail: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}
