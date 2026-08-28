import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { RetrievalContext, RetrievalProvider, RetrievalProviderResult } from '../retrieval.types';

@Injectable()
export class SchedulingRetrievalProvider implements RetrievalProvider {
  readonly name = 'scheduling';

  constructor(private readonly prismaService: PrismaService) {}

  supports(request: RetrievalContext['request']): boolean {
    return ['schedule-plan', 'schedule-shift'].includes(request.targetEntityType);
  }

  async retrieve(context: RetrievalContext): Promise<RetrievalProviderResult> {
    const { organizationId, targetEntityId, targetEntityType, maxRecords, includeRelated } = context.request;

    if (!targetEntityId) {
      return { contextNotes: ['Scheduling retrieval skipped because targetEntityId was not provided.'] };
    }

    if (targetEntityType === 'schedule-plan') {
      const plan = await this.prismaService.schedulePlan.findFirst({
        where: { id: targetEntityId, organizationId },
        include: {
          shifts: { orderBy: [{ startsAt: 'asc' }], take: maxRecords },
        },
      });

      if (!plan) {
        return { contextNotes: ['No schedule plan was found for the requested scope.'] };
      }

      return {
        entitySnapshot: {
          id: plan.id,
          name: plan.name,
          planType: plan.planType,
          status: plan.status,
          planningWindowStart: plan.planningWindowStart,
          planningWindowEnd: plan.planningWindowEnd,
          ownerUserId: plan.ownerUserId,
        },
        relatedEntities: plan.shifts.map((shift) => ({
          entityType: 'schedule-shift',
          id: shift.id,
          title: shift.title,
          status: shift.status,
          startsAt: shift.startsAt,
          endsAt: shift.endsAt,
        })),
        operationalMetrics: [
          { key: 'shift_count', label: 'Shifts in plan', value: plan.shifts.length },
        ],
      };
    }

    const shift = await this.prismaService.scheduleShift.findFirst({
      where: { id: targetEntityId, organizationId },
      include: {
        assignments: includeRelated ? { orderBy: [{ assignedAt: 'desc' }], take: maxRecords } : false,
        zone: true,
        schedulePlan: true,
      },
    });

    if (!shift) {
      return { contextNotes: ['No schedule shift was found for the requested scope.'] };
    }

    const assignedCount = shift.assignments?.length ?? 0;
    const capacityRequired = shift.capacityRequired ?? 0;
    const capacityAllocated = shift.capacityAllocated ?? assignedCount;

    return {
      entitySnapshot: {
        id: shift.id,
        shiftCode: shift.shiftCode,
        title: shift.title,
        shiftType: shift.shiftType,
        status: shift.status,
        zoneId: shift.zoneId,
        ownerUserId: shift.ownerUserId,
        startsAt: shift.startsAt,
        endsAt: shift.endsAt,
        capacityRequired,
        capacityAllocated,
      },
      relatedEntities: [
        ...(shift.schedulePlan ? [{ entityType: 'schedule-plan', id: shift.schedulePlan.id, name: shift.schedulePlan.name }] : []),
        ...(shift.zone ? [{ entityType: 'operational-zone', id: shift.zone.id, name: shift.zone.name }] : []),
        ...(shift.assignments ?? []).map((assignment) => ({ entityType: 'resource-assignment', id: assignment.id, status: assignment.status })),
      ],
      operationalMetrics: [
        { key: 'capacity_required', label: 'Required capacity', value: capacityRequired },
        { key: 'capacity_allocated', label: 'Allocated capacity', value: capacityAllocated },
        { key: 'assignment_count', label: 'Assignments', value: assignedCount },
      ],
      riskSignals: [
        ...(capacityRequired > 0 && capacityAllocated < capacityRequired
          ? [{ code: 'SHIFT_UNDERSTAFFED', severity: 'HIGH' as const, message: 'Shift capacity is below required staffing.' }]
          : []),
        ...(capacityRequired > 0 && capacityAllocated > capacityRequired
          ? [{ code: 'SHIFT_OVER_CAPACITY', severity: 'MEDIUM' as const, message: 'Shift capacity exceeds required staffing.' }]
          : []),
      ],
    };
  }
}
