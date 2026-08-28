import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RetrievalRepository {
  constructor(private readonly prismaService: PrismaService) {}

  getDomainEventsForEntity(
    organizationId: string,
    aggregateType: string,
    aggregateId: string,
    take: number,
  ) {
    return this.prismaService.domainEvent.findMany({
      where: {
        organizationId,
        aggregateType,
        aggregateId,
      },
      orderBy: [{ occurredAt: 'desc' }],
      take,
      select: {
        id: true,
        eventType: true,
        aggregateType: true,
        aggregateId: true,
        occurredAt: true,
        payload: true,
        metadata: true,
      },
    });
  }

  getApprovalsForEntity(organizationId: string, entityType: string, entityId: string, take: number) {
    return this.prismaService.approvalRequest.findMany({
      where: {
        organizationId,
        entityType,
        entityId,
      },
      orderBy: [{ createdAt: 'desc' }],
      take,
      select: {
        id: true,
        title: true,
        status: true,
        requestedByUserId: true,
        createdAt: true,
        resolvedAt: true,
      },
    });
  }

  getAuditLogsForEntity(organizationId: string, entityType: string, entityId: string, take: number) {
    return this.prismaService.auditLog.findMany({
      where: {
        organizationId,
        entityType,
        entityId,
      },
      orderBy: [{ createdAt: 'desc' }],
      take,
      select: {
        id: true,
        action: true,
        summary: true,
        actorUserId: true,
        createdAt: true,
        metadata: true,
      },
    });
  }
}
