import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { ListSchedulePlansQueryDto } from '../dto/list-schedule-plans-query.dto';

export function buildSchedulePlansWhere(
  query: ListSchedulePlansQueryDto,
  principal?: CurrentPrincipal,
): Prisma.SchedulePlanWhereInput {
  const organizationId = query.organizationId ?? principal?.organizationId;
  const search = query.search?.trim();

  return {
    ...(organizationId ? { organizationId } : {}),
    ...(query.planType ? { planType: query.planType } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.ownerUserId ? { ownerUserId: query.ownerUserId } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
  };
}
