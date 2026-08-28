import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { AllocateShiftCapacityDto } from './dto/allocate-shift-capacity.dto';
import {
  ScheduleShiftCapacityUpdatedEventPayload,
  SchedulingEvents,
} from './events/scheduling.events';
import { SchedulingPolicyService } from './policies/scheduling-policy.service';
import { ShiftCapacitySummaryPresenter } from './presenters/shift-capacity-summary.presenter';
import { ScheduleShiftsRepository } from './schedule-shifts.repository';

@Injectable()
export class ShiftCapacityService {
  constructor(
    private readonly scheduleShiftsRepository: ScheduleShiftsRepository,
    private readonly schedulingPolicyService: SchedulingPolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async updateCapacity(
    id: string,
    dto: AllocateShiftCapacityDto,
    principal?: CurrentPrincipal,
  ) {
    const shift = await this.scheduleShiftsRepository.findShiftById(id);
    if (!shift) {
      throw new NotFoundException('Schedule shift not found.');
    }

    this.schedulingPolicyService.assertCanUpdateCapacity(principal, shift.organizationId);

    const updated = await this.scheduleShiftsRepository.updateShift(id, {
      ...(dto.capacityRequired !== undefined ? { capacityRequired: dto.capacityRequired } : {}),
      ...(dto.capacityAllocated !== undefined ? { capacityAllocated: dto.capacityAllocated } : {}),
      ...(dto.metadata !== undefined
        ? { metadata: dto.metadata as Prisma.InputJsonValue }
        : {}),
    });

    const assignedCount = await this.scheduleShiftsRepository.countAssignments(id);
    const summary: ShiftCapacitySummaryPresenter = {
      capacityRequired: updated.capacityRequired,
      capacityAllocated: updated.capacityAllocated,
      assignedCount,
      remainingCapacity:
        updated.capacityRequired === null
          ? null
          : updated.capacityRequired - assignedCount,
      isOverCapacity:
        updated.capacityRequired !== null
          ? assignedCount > updated.capacityRequired
          : false,
      isUnderstaffed:
        updated.capacityRequired !== null
          ? assignedCount < updated.capacityRequired
          : false,
    };

    await this.auditService.record({
      action: 'schedule-shift.capacity.update',
      entityType: 'schedule-shift',
      entityId: updated.id,
      organizationId: updated.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Updated capacity for schedule shift ${updated.shiftCode}.`,
      metadata: summary as unknown as Prisma.InputJsonValue,
    });

    const payload: ScheduleShiftCapacityUpdatedEventPayload = {
      scheduleShiftId: updated.id,
      organizationId: updated.organizationId,
      capacityRequired: updated.capacityRequired,
      capacityAllocated: updated.capacityAllocated,
      assignedCount,
    };

    await this.domainEventsService.publish({
      organizationId: updated.organizationId,
      eventType: SchedulingEvents.scheduleShiftCapacityUpdated,
      aggregateType: 'schedule-shift',
      aggregateId: updated.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    if (summary.isOverCapacity) {
      await this.domainEventsService.publish({
        organizationId: updated.organizationId,
        eventType: SchedulingEvents.scheduleShiftOverCapacity,
        aggregateType: 'schedule-shift',
        aggregateId: updated.id,
        triggeredByUserId: principal?.userId ?? null,
        payload,
      });
    }

    if (summary.isUnderstaffed) {
      await this.domainEventsService.publish({
        organizationId: updated.organizationId,
        eventType: SchedulingEvents.scheduleShiftUnderstaffed,
        aggregateType: 'schedule-shift',
        aggregateId: updated.id,
        triggeredByUserId: principal?.userId ?? null,
        payload,
      });
    }

    return buildSuccessResponse('Schedule shift capacity updated successfully.', summary);
  }
}
