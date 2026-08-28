import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { CreateScheduleShiftDto } from './dto/create-schedule-shift.dto';
import { UpdateScheduleShiftDto } from './dto/update-schedule-shift.dto';
import {
  ScheduleShiftCreatedEventPayload,
  ScheduleShiftUpdatedEventPayload,
  SchedulingEvents,
} from './events/scheduling.events';
import { toScheduleShiftResponse } from './mappers/scheduling.mapper';
import { SchedulingPolicyService } from './policies/scheduling-policy.service';
import { ScheduleShiftsRepository } from './schedule-shifts.repository';

@Injectable()
export class ScheduleShiftsService {
  constructor(
    private readonly scheduleShiftsRepository: ScheduleShiftsRepository,
    private readonly schedulingPolicyService: SchedulingPolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async createShift(dto: CreateScheduleShiftDto, principal?: CurrentPrincipal) {
    const shift = await this.scheduleShiftsRepository.createShift({
      organization: { connect: { id: dto.organizationId } },
      ...(dto.schedulePlanId ? { schedulePlan: { connect: { id: dto.schedulePlanId } } } : {}),
      ...(dto.zoneId ? { zone: { connect: { id: dto.zoneId } } } : {}),
      ownerUser: principal?.userId ? { connect: { id: principal.userId } } : undefined,
      shiftCode: dto.shiftCode,
      shiftType: dto.shiftType,
      title: dto.title,
      status: dto.status,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      capacityRequired: dto.capacityRequired,
      capacityAllocated: dto.capacityAllocated,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.record({
      action: 'schedule-shift.create',
      entityType: 'schedule-shift',
      entityId: shift.id,
      organizationId: shift.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Created schedule shift ${shift.shiftCode}.`,
    });

    const payload: ScheduleShiftCreatedEventPayload = {
      scheduleShiftId: shift.id,
      organizationId: shift.organizationId,
      shiftCode: shift.shiftCode,
      shiftType: shift.shiftType,
      status: shift.status,
      zoneId: shift.zoneId,
    };

    await this.domainEventsService.publish({
      organizationId: shift.organizationId,
      eventType: SchedulingEvents.scheduleShiftCreated,
      aggregateType: 'schedule-shift',
      aggregateId: shift.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Schedule shift created successfully.',
      toScheduleShiftResponse(shift),
    );
  }

  async updateShift(id: string, dto: UpdateScheduleShiftDto, principal?: CurrentPrincipal) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one schedule shift field must be provided.');
    }

    const existing = await this.findShiftById(id);
    this.schedulingPolicyService.assertCanManageShifts(principal, existing.organizationId);

    const shift = await this.scheduleShiftsRepository.updateShift(id, {
      ...(dto.schedulePlanId !== undefined
        ? dto.schedulePlanId
          ? { schedulePlan: { connect: { id: dto.schedulePlanId } } }
          : { schedulePlan: { disconnect: true } }
        : {}),
      ...(dto.zoneId !== undefined
        ? dto.zoneId
          ? { zone: { connect: { id: dto.zoneId } } }
          : { zone: { disconnect: true } }
        : {}),
      ...(dto.shiftCode !== undefined ? { shiftCode: dto.shiftCode } : {}),
      ...(dto.shiftType !== undefined ? { shiftType: dto.shiftType } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
      ...(dto.endsAt !== undefined ? { endsAt: new Date(dto.endsAt) } : {}),
      ...(dto.capacityRequired !== undefined ? { capacityRequired: dto.capacityRequired } : {}),
      ...(dto.capacityAllocated !== undefined ? { capacityAllocated: dto.capacityAllocated } : {}),
      ...(dto.metadata !== undefined
        ? {
            metadata:
              dto.metadata === null ? Prisma.JsonNull : (dto.metadata as Prisma.InputJsonValue),
          }
        : {}),
    });

    await this.auditService.record({
      action: 'schedule-shift.update',
      entityType: 'schedule-shift',
      entityId: shift.id,
      organizationId: shift.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Updated schedule shift ${shift.shiftCode}.`,
      metadata: { changedFields: Object.keys(dto) },
    });

    const payload: ScheduleShiftUpdatedEventPayload = {
      scheduleShiftId: shift.id,
      organizationId: shift.organizationId,
      changedFields: Object.keys(dto),
    };

    await this.domainEventsService.publish({
      organizationId: shift.organizationId,
      eventType: SchedulingEvents.scheduleShiftUpdated,
      aggregateType: 'schedule-shift',
      aggregateId: shift.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Schedule shift updated successfully.',
      toScheduleShiftResponse(shift),
    );
  }

  private async findShiftById(id: string) {
    const shift = await this.scheduleShiftsRepository.findShiftById(id);
    if (!shift) {
      throw new NotFoundException('Schedule shift not found.');
    }
    return shift;
  }
}
