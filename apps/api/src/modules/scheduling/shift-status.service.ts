import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ScheduleShiftStatus } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { UpdateScheduleShiftStatusDto } from './dto/update-schedule-shift-status.dto';
import {
  ScheduleShiftStatusChangedEventPayload,
  SchedulingEvents,
} from './events/scheduling.events';
import { toScheduleShiftResponse } from './mappers/scheduling.mapper';
import { SchedulingPolicyService } from './policies/scheduling-policy.service';
import { ScheduleShiftsRepository } from './schedule-shifts.repository';

@Injectable()
export class ShiftStatusService {
  constructor(
    private readonly scheduleShiftsRepository: ScheduleShiftsRepository,
    private readonly schedulingPolicyService: SchedulingPolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async updateStatus(id: string, dto: UpdateScheduleShiftStatusDto, principal?: CurrentPrincipal) {
    const shift = await this.scheduleShiftsRepository.findShiftById(id);
    if (!shift) {
      throw new NotFoundException('Schedule shift not found.');
    }

    this.schedulingPolicyService.assertCanChangeShiftStatus(
      principal,
      shift.organizationId,
      shift.status,
      dto.status,
    );

    const updated = await this.scheduleShiftsRepository.updateShift(id, {
      status: dto.status,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.record({
      action: 'schedule-shift.status.update',
      entityType: 'schedule-shift',
      entityId: updated.id,
      organizationId: updated.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Transitioned schedule shift ${updated.shiftCode} from ${shift.status.toLowerCase()} to ${updated.status.toLowerCase()}.`,
      metadata: {
        previousStatus: shift.status,
        nextStatus: updated.status,
        reason: dto.reason ?? null,
      },
    });

    const payload: ScheduleShiftStatusChangedEventPayload = {
      scheduleShiftId: updated.id,
      organizationId: updated.organizationId,
      previousStatus: shift.status,
      nextStatus: updated.status,
      changedByUserId: principal?.userId ?? null,
      reason: dto.reason ?? null,
    };

    await this.domainEventsService.publish({
      organizationId: updated.organizationId,
      eventType: SchedulingEvents.scheduleShiftStatusChanged,
      aggregateType: 'schedule-shift',
      aggregateId: updated.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Schedule shift status updated successfully.',
      toScheduleShiftResponse(updated),
    );
  }
}
