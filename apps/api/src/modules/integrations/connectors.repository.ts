import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConnectorsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  listDefinitions() {
    return this.prismaService.connectorDefinition.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  }

  listInstances(organizationId: string) {
    return this.prismaService.connectorInstance.findMany({
      where: { organizationId },
      include: { connectorDefinition: true, credentials: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findInstanceById(id: string) {
    return this.prismaService.connectorInstance.findUnique({
      where: { id },
      include: { connectorDefinition: true, credentials: true },
    });
  }

  createInstance(data: Prisma.ConnectorInstanceUncheckedCreateInput) {
    return this.prismaService.connectorInstance.create({ data });
  }

  createCredential(data: Prisma.ConnectorCredentialUncheckedCreateInput) {
    return this.prismaService.connectorCredential.create({ data });
  }

  createActionLog(data: Prisma.ConnectorActionLogUncheckedCreateInput) {
    return this.prismaService.connectorActionLog.create({ data });
  }

  updateActionLog(id: string, data: Prisma.ConnectorActionLogUncheckedUpdateInput) {
    return this.prismaService.connectorActionLog.update({ where: { id }, data });
  }

  createSyncJob(data: Prisma.ConnectorSyncJobUncheckedCreateInput) {
    return this.prismaService.connectorSyncJob.create({ data });
  }

  updateSyncJob(id: string, data: Prisma.ConnectorSyncJobUncheckedUpdateInput) {
    return this.prismaService.connectorSyncJob.update({ where: { id }, data });
  }

  findRecentActionLogByTarget(connectorInstanceId: string, actionType: string, targetRef?: string | null) {
    return this.prismaService.connectorActionLog.findFirst({
      where: {
        connectorInstanceId,
        actionType,
        ...(targetRef ? { targetRef } : {}),
      },
      orderBy: { executedAt: 'desc' },
    });
  }
}
