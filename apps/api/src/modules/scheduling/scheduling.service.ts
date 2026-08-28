import { Injectable } from '@nestjs/common';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';

import { CreateSchedulePlanDto } from './dto/create-schedule-plan.dto';
import { CreateScheduleShiftDto } from './dto/create-schedule-shift.dto';
import { PublishSchedulePlanDto } from './dto/publish-schedule-plan.dto';
import { QuerySchedulePlansDto } from './dto/query-schedule-plans.dto';
import { QueryScheduleShiftsDto } from './dto/query-schedule-shifts.dto';
import { UpdateSchedulePlanDto } from './dto/update-schedule-plan.dto';
import { UpdateScheduleShiftDto } from './dto/update-schedule-shift.dto';
import { SchedulePlansService } from './schedule-plans.service';
import { ScheduleShiftsQueryService } from './schedule-shifts-query.service';
import { ScheduleShiftsService } from './schedule-shifts.service';

@Injectable()
export class SchedulingService {
  constructor(
    private readonly schedulePlansService: SchedulePlansService,
    private readonly scheduleShiftsService: ScheduleShiftsService,
    private readonly scheduleShiftsQueryService: ScheduleShiftsQueryService,
  ) {}

  async createPlan(dto: CreateSchedulePlanDto, ownerUserId?: string) {
    return this.schedulePlansService.createPlan(
      dto,
      ownerUserId ? this.buildCompatibilityPrincipal(ownerUserId, dto.organizationId) : undefined,
    );
  }

  async findPlans(query: QuerySchedulePlansDto) {
    return this.schedulePlansService.listPlans(query, undefined);
  }

  async findPlan(id: string) {
    return this.schedulePlansService.getPlanDetail(id, undefined);
  }

  async updatePlan(id: string, dto: UpdateSchedulePlanDto) {
    return this.schedulePlansService.updatePlan(id, dto, undefined);
  }

  async publishPlan(id: string, actorUserId: string | undefined, dto: PublishSchedulePlanDto) {
    void actorUserId;
    return this.schedulePlansService.publishPlan(id, dto, undefined);
  }

  async createShift(dto: CreateScheduleShiftDto, ownerUserId?: string) {
    return this.scheduleShiftsService.createShift(
      dto,
      ownerUserId ? this.buildCompatibilityPrincipal(ownerUserId, dto.organizationId) : undefined,
    );
  }

  async findShifts(query: QueryScheduleShiftsDto) {
    return this.scheduleShiftsQueryService.listShifts(query, undefined);
  }

  async findShift(id: string) {
    return this.scheduleShiftsQueryService.getShiftDetail(id, undefined);
  }

  async updateShift(id: string, dto: UpdateScheduleShiftDto) {
    return this.scheduleShiftsService.updateShift(id, dto, undefined);
  }

  private buildCompatibilityPrincipal(
    userId: string,
    organizationId: string,
  ): CurrentPrincipal {
    return {
      userId,
      email: '',
      organizationId,
      roles: [],
      permissions: [],
    };
  }
}
