import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GraphRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findOrganization(organizationId: string) {
    return this.prismaService.organization.findUnique({
      where: { id: organizationId },
      include: {
        departments: { where: { deletedAt: null }, orderBy: { name: 'asc' }, take: 25 },
      },
    });
  }

  findWorkforceMember(organizationId: string, id: string, maxRecords: number) {
    return this.prismaService.workforceMember.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        organization: true,
        primaryDepartment: true,
        primaryPosition: true,
        homeZone: true,
        credentialDocuments: {
          orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
          take: Math.min(maxRecords, 8),
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          take: Math.min(maxRecords, 12),
          include: {
            shift: true,
            workOrder: true,
            asset: true,
            zone: true,
          },
        },
        incidents: {
          orderBy: { reportedAt: 'desc' },
          take: Math.min(maxRecords, 6),
          include: { workOrder: true, asset: true, zone: true },
        },
      },
    });
  }

  findAsset(organizationId: string, id: string, maxRecords: number) {
    return this.prismaService.asset.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        organization: true,
        zone: true,
        assignments: {
          orderBy: { assignedAt: 'desc' },
          take: Math.min(maxRecords, 12),
          include: {
            workOrder: true,
            shift: true,
            workforceMember: true,
            zone: true,
          },
        },
        incidents: {
          orderBy: { reportedAt: 'desc' },
          take: Math.min(maxRecords, 8),
          include: { workOrder: true, workforceMember: true, zone: true },
        },
        maintenanceRecords: {
          orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
          take: Math.min(maxRecords, 8),
          include: { performedByWorkforceMember: true },
        },
      },
    });
  }

  findWorkOrder(organizationId: string, id: string, maxRecords: number) {
    return this.prismaService.workOrder.findFirst({
      where: { id, organizationId },
      include: {
        organization: true,
        zone: true,
        assignments: {
          orderBy: { assignedAt: 'desc' },
          take: Math.min(maxRecords, 14),
          include: {
            workforceMember: true,
            asset: true,
            shift: true,
            zone: true,
          },
        },
        incidents: {
          orderBy: { reportedAt: 'desc' },
          take: Math.min(maxRecords, 8),
          include: { asset: true, workforceMember: true, zone: true },
        },
      },
    });
  }

  findScheduleShift(organizationId: string, id: string, maxRecords: number) {
    return this.prismaService.scheduleShift.findFirst({
      where: { id, organizationId },
      include: {
        organization: true,
        zone: true,
        schedulePlan: true,
        assignments: {
          orderBy: { assignedAt: 'desc' },
          take: Math.min(maxRecords, 16),
          include: {
            workforceMember: true,
            asset: true,
            workOrder: true,
            zone: true,
          },
        },
      },
    });
  }

  findOperationalIncident(organizationId: string, id: string, maxRecords: number) {
    return this.prismaService.operationalIncident.findFirst({
      where: { id, organizationId },
      include: {
        organization: true,
        zone: true,
        workOrder: true,
        workforceMember: true,
        asset: true,
        actions: {
          orderBy: { performedAt: 'desc' },
          take: Math.min(maxRecords, 8),
        },
      },
    });
  }

  findAssignment(organizationId: string, id: string) {
    return this.prismaService.resourceAssignment.findFirst({
      where: { id, organizationId },
      include: {
        organization: true,
        workforceMember: true,
        asset: true,
        shift: true,
        workOrder: true,
        zone: true,
      },
    });
  }

  findOperationalZone(organizationId: string, id: string, maxRecords: number) {
    return this.prismaService.operationalZone.findFirst({
      where: { id, organizationId },
      include: {
        organization: true,
        parentZone: true,
        childZones: { take: Math.min(maxRecords, 8), orderBy: { name: 'asc' } },
        workforceMembers: { take: Math.min(maxRecords, 10), orderBy: { createdAt: 'desc' } },
        assets: { take: Math.min(maxRecords, 10), orderBy: { createdAt: 'desc' } },
        workOrders: { take: Math.min(maxRecords, 12), orderBy: { createdAt: 'desc' } },
        scheduleShifts: { take: Math.min(maxRecords, 8), orderBy: { startsAt: 'asc' } },
        incidents: { take: Math.min(maxRecords, 8), orderBy: { reportedAt: 'desc' } },
      },
    });
  }

  findAgentRunsForEntity(organizationId: string, entityType: string, entityId: string, maxRecords: number) {
    return this.prismaService.agentRun.findMany({
      where: { organizationId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(maxRecords, 6),
      include: {
        agentDefinition: true,
        decisions: { take: 4, orderBy: { createdAt: 'desc' } },
      },
    });
  }
}
