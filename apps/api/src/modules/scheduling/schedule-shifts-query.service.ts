import { Injectable, NotFoundException } from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import { ListScheduleShiftsQueryDto } from './dto/list-schedule-shifts-query.dto';
import { buildScheduleShiftsWhere } from './mappers/schedule-shifts-where.builder';
import { toScheduleShiftResponse } from './mappers/scheduling.mapper';
import { SchedulingPolicyService } from './policies/scheduling-policy.service';
import { ScheduleShiftDetailPresenter } from './presenters/schedule-shift-detail.presenter';
import { ScheduleShiftsRepository } from './schedule-shifts.repository';

@Injectable()
export class ScheduleShiftsQueryService {
  constructor(
    private readonly scheduleShiftsRepository: ScheduleShiftsRepository,
    private readonly schedulingPolicyService: SchedulingPolicyService,
  ) {}

  async listShifts(query: ListScheduleShiftsQueryDto, principal?: CurrentPrincipal) {
    const { page, limit, skip } = resolvePagination(query);
    const where = buildScheduleShiftsWhere(query, principal);
    const [items, total] = await Promise.all([
      this.scheduleShiftsRepository.listShifts(where, skip, limit),
      this.scheduleShiftsRepository.countShifts(where),
    ]);

    return buildPaginatedResponse(
      'Schedule shifts retrieved successfully.',
      items.map((item) => toScheduleShiftResponse(item)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getShiftDetail(id: string, principal?: CurrentPrincipal) {
    const shift = await this.scheduleShiftsRepository.findShiftById(id);
    if (!shift) {
      throw new NotFoundException('Schedule shift not found.');
    }

    this.schedulingPolicyService.assertCanViewShifts(principal, shift.organizationId);
    const assignedCount = await this.scheduleShiftsRepository.countAssignments(id);
    const capacityRequired = shift.capacityRequired ?? null;
    const capacityAllocated = shift.capacityAllocated ?? null;

    const detail: ScheduleShiftDetailPresenter = {
      ...toScheduleShiftResponse(shift),
      metadata: shift.metadata,
      capacitySummary: {
        capacityRequired,
        capacityAllocated,
        assignedCount,
        remainingCapacity:
          capacityRequired === null ? null : capacityRequired - assignedCount,
        isOverCapacity:
          capacityRequired !== null ? assignedCount > capacityRequired : false,
        isUnderstaffed:
          capacityRequired !== null ? assignedCount < capacityRequired : false,
      },
    };

    return buildSuccessResponse('Schedule shift retrieved successfully.', detail);
  }

  async getReadinessSummary(organizationId: string) {
    const [scheduledCount, activeCount, completedCount] =
      await this.scheduleShiftsRepository.getSummaryCounts(organizationId);

    return buildSuccessResponse('Schedule readiness summary retrieved successfully.', {
      organizationId,
      scheduledCount,
      activeCount,
      completedCount,
      generatedAt: new Date().toISOString(),
    });
  }
}
