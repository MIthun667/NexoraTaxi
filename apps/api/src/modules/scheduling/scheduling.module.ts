import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { SchedulePlansController } from './schedule-plans.controller';
import { SchedulePlansRepository } from './schedule-plans.repository';
import { SchedulePlansService } from './schedule-plans.service';
import { ScheduleShiftsController } from './schedule-shifts.controller';
import { ScheduleShiftsQueryService } from './schedule-shifts-query.service';
import { ScheduleShiftsRepository } from './schedule-shifts.repository';
import { ScheduleShiftsService } from './schedule-shifts.service';
import { SchedulingPolicyService } from './policies/scheduling-policy.service';
import { SchedulingService } from './scheduling.service';
import { ShiftCapacityService } from './shift-capacity.service';
import { ShiftStatusService } from './shift-status.service';

@Module({
  imports: [AuditModule],
  controllers: [SchedulePlansController, ScheduleShiftsController],
  providers: [
    SchedulingService,
    SchedulePlansRepository,
    ScheduleShiftsRepository,
    SchedulePlansService,
    ScheduleShiftsService,
    ScheduleShiftsQueryService,
    ShiftStatusService,
    ShiftCapacityService,
    SchedulingPolicyService,
  ],
  exports: [
    SchedulingService,
    ScheduleShiftsRepository,
    SchedulePlansService,
    ScheduleShiftsService,
    ScheduleShiftsQueryService,
    ShiftStatusService,
    ShiftCapacityService,
  ],
})
export class SchedulingModule {}
