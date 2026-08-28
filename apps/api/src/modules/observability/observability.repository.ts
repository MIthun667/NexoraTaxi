import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ObservabilityRepository {
  constructor(private readonly prismaService: PrismaService) {}

  createAlert(data: Prisma.SystemAlertCreateInput | Prisma.SystemAlertUncheckedCreateInput) {
    return this.prismaService.systemAlert.create({ data });
  }

  updateAlert(id: string, data: Prisma.SystemAlertUpdateInput | Prisma.SystemAlertUncheckedUpdateInput) {
    return this.prismaService.systemAlert.update({ where: { id }, data });
  }

  findOpenAlertByType(organizationId: string | null, sourceModule: string, alertType: string) {
    return this.prismaService.systemAlert.findFirst({
      where: {
        organizationId,
        sourceModule,
        alertType,
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      },
      orderBy: { triggeredAt: 'desc' },
    });
  }

  listRecentAlerts(organizationId?: string | null, take = 25) {
    return this.prismaService.systemAlert.findMany({
      where: organizationId ? { organizationId } : undefined,
      orderBy: [{ status: 'asc' }, { triggeredAt: 'desc' }],
      take,
    });
  }

  countOpenAlerts(organizationId?: string | null) {
    return this.prismaService.systemAlert.count({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      },
    });
  }

  countCriticalOpenAlerts(organizationId?: string | null) {
    return this.prismaService.systemAlert.count({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        severity: 'CRITICAL',
      },
    });
  }

  createHealthCheckLog(
    data: Prisma.HealthCheckLogCreateInput | Prisma.HealthCheckLogUncheckedCreateInput,
  ) {
    return this.prismaService.healthCheckLog.create({ data });
  }

  countConnectorFailuresSince(windowStart: Date, organizationId?: string | null) {
    return this.prismaService.connectorActionLog.count({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: 'FAILED',
        executedAt: { gte: windowStart },
      },
    });
  }

  countSyncFailuresSince(windowStart: Date, organizationId?: string | null) {
    return this.prismaService.connectorSyncJob.count({
      where: {
        connectorInstance: organizationId ? { organizationId } : undefined,
        status: 'FAILED',
        startedAt: { gte: windowStart },
      },
    });
  }

  async aggregateOperationalMetrics(organizationId?: string | null) {
    const [workOrdersActive, incidentsOpen, availableWorkforce, assetsOperational, activeAssignments] =
      await Promise.all([
        this.prismaService.workOrder.count({
          where: {
            ...(organizationId ? { organizationId } : {}),
            status: { in: ['READY', 'ACTIVE', 'BLOCKED'] },
          },
        }),
        this.prismaService.operationalIncident.count({
          where: {
            ...(organizationId ? { organizationId } : {}),
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
        }),
        this.prismaService.workforceMember.count({
          where: {
            ...(organizationId ? { organizationId } : {}),
            deletedAt: null,
            availabilityStatus: 'AVAILABLE',
          },
        }),
        this.prismaService.asset.count({
          where: {
            ...(organizationId ? { organizationId } : {}),
            deletedAt: null,
            operationalStatus: { in: ['ACTIVE', 'IN_SERVICE'] },
          },
        }),
        this.prismaService.resourceAssignment.count({
          where: {
            ...(organizationId ? { organizationId } : {}),
            status: { in: ['ASSIGNED', 'ACTIVE'] },
          },
        }),
      ]);

    return {
      workOrdersActive,
      incidentsOpen,
      availableWorkforce,
      assetsOperational,
      activeAssignments,
    };
  }
}
