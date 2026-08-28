import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { ListWorkOrdersQueryDto } from '../dto/list-work-orders-query.dto';

export function buildWorkOrdersWhere(
  query: ListWorkOrdersQueryDto,
  principal?: CurrentPrincipal,
): Prisma.WorkOrderWhereInput {
  const search = query.search?.trim();
  const organizationId = query.organizationId ?? principal?.organizationId;

  return {
    ...(organizationId ? { organizationId } : {}),
    ...(query.workType ? { workType: { contains: query.workType.trim(), mode: 'insensitive' } } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.zoneId ? { zoneId: query.zoneId } : {}),
    ...(query.createdByUserId ? { createdByUserId: query.createdByUserId } : {}),
    ...(query.scheduledStartFrom || query.scheduledStartTo
      ? {
          scheduledStartAt: {
            ...(query.scheduledStartFrom ? { gte: new Date(query.scheduledStartFrom) } : {}),
            ...(query.scheduledStartTo ? { lte: new Date(query.scheduledStartTo) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { workOrderCode: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { workType: { contains: search, mode: 'insensitive' } },
            { sourceType: { contains: search, mode: 'insensitive' } },
            { sourceId: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}
