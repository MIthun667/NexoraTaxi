import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { RetrievalContext, RetrievalProvider, RetrievalProviderResult } from '../retrieval.types';

@Injectable()
export class OperationsRetrievalProvider implements RetrievalProvider {
  readonly name = 'operations';

  constructor(private readonly prismaService: PrismaService) {}

  supports(request: RetrievalContext['request']): boolean {
    return ['work-order', 'operational-zone'].includes(request.targetEntityType);
  }

  async retrieve(context: RetrievalContext): Promise<RetrievalProviderResult> {
    const { organizationId, targetEntityId, targetEntityType, maxRecords, includeRelated } = context.request;

    if (!targetEntityId) {
      return { contextNotes: ['Operations retrieval skipped because targetEntityId was not provided.'] };
    }

    if (targetEntityType === 'operational-zone') {
      const zone = await this.prismaService.operationalZone.findFirst({
        where: { id: targetEntityId, organizationId },
        include: {
          childZones: { take: maxRecords },
          workOrders: includeRelated ? { orderBy: [{ createdAt: 'desc' }], take: maxRecords } : false,
          scheduleShifts: includeRelated ? { orderBy: [{ startsAt: 'asc' }], take: maxRecords } : false,
        },
      });

      if (!zone) {
        return { contextNotes: ['No operational zone was found for the requested scope.'] };
      }

      return {
        entitySnapshot: {
          id: zone.id,
          zoneCode: zone.zoneCode,
          name: zone.name,
          zoneType: zone.zoneType,
          parentZoneId: zone.parentZoneId,
          isActive: zone.isActive,
        },
        relatedEntities: [
          ...zone.childZones.map((child) => ({ entityType: 'operational-zone', id: child.id, name: child.name })),
          ...(zone.workOrders ?? []).map((workOrder) => ({ entityType: 'work-order', id: workOrder.id, title: workOrder.title, status: workOrder.status })),
          ...(zone.scheduleShifts ?? []).map((shift) => ({ entityType: 'schedule-shift', id: shift.id, title: shift.title, status: shift.status })),
        ],
        operationalMetrics: [
          { key: 'child_zone_count', label: 'Child zones', value: zone.childZones.length },
          { key: 'recent_work_order_count', label: 'Recent work orders', value: zone.workOrders?.length ?? 0 },
        ],
      };
    }

    const workOrder = await this.prismaService.workOrder.findFirst({
      where: { id: targetEntityId, organizationId },
      include: {
        assignments: includeRelated ? { orderBy: [{ assignedAt: 'desc' }], take: maxRecords } : false,
        incidents: includeRelated ? { orderBy: [{ reportedAt: 'desc' }], take: maxRecords } : false,
        zone: true,
      },
    });

    if (!workOrder) {
      return { contextNotes: ['No work order was found for the requested scope.'] };
    }

    return {
      entitySnapshot: {
        id: workOrder.id,
        workOrderCode: workOrder.workOrderCode,
        title: workOrder.title,
        workType: workOrder.workType,
        status: workOrder.status,
        priority: workOrder.priority,
        zoneId: workOrder.zoneId,
        scheduledStartAt: workOrder.scheduledStartAt,
        scheduledEndAt: workOrder.scheduledEndAt,
        actualStartAt: workOrder.actualStartAt,
        actualEndAt: workOrder.actualEndAt,
      },
      relatedEntities: [
        ...(workOrder.zone ? [{ entityType: 'operational-zone', id: workOrder.zone.id, name: workOrder.zone.name }] : []),
        ...(workOrder.assignments ?? []).map((assignment) => ({ entityType: 'resource-assignment', id: assignment.id, status: assignment.status })),
        ...(workOrder.incidents ?? []).map((incident) => ({ entityType: 'operational-incident', id: incident.id, severity: incident.severity, status: incident.status })),
      ],
      operationalMetrics: [
        { key: 'assignment_count', label: 'Assignments', value: workOrder.assignments?.length ?? 0 },
        { key: 'incident_count', label: 'Incidents', value: workOrder.incidents?.length ?? 0 },
      ],
      riskSignals: [
        ...(workOrder.status === 'BLOCKED'
          ? [{ code: 'WORK_ORDER_BLOCKED', severity: 'HIGH' as const, message: 'Work order is currently blocked.' }]
          : []),
      ],
    };
  }
}
