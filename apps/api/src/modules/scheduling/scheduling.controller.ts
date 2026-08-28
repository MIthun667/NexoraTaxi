import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../common/constants/platform-permissions.constants';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateSchedulePlanDto } from './dto/create-schedule-plan.dto';
import { CreateScheduleShiftDto } from './dto/create-schedule-shift.dto';
import { PublishSchedulePlanDto } from './dto/publish-schedule-plan.dto';
import { QuerySchedulePlansDto } from './dto/query-schedule-plans.dto';
import { QueryScheduleShiftsDto } from './dto/query-schedule-shifts.dto';
import { UpdateSchedulePlanDto } from './dto/update-schedule-plan.dto';
import { UpdateScheduleShiftDto } from './dto/update-schedule-shift.dto';
import { SchedulingService } from './scheduling.service';

@Controller()
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post('schedule-plans')
  @Permissions(PlatformPermissions.operationsManage)
  createPlan(@Req() request: Request, @Body() dto: CreateSchedulePlanDto) {
    return this.schedulingService.createPlan(dto, request.principal?.userId);
  }

  @Get('schedule-plans')
  @Permissions(PlatformPermissions.operationsRead)
  findPlans(@Query() query: QuerySchedulePlansDto) {
    return this.schedulingService.findPlans(query);
  }

  @Get('schedule-plans/:id')
  @Permissions(PlatformPermissions.operationsRead)
  findPlan(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.schedulingService.findPlan(id);
  }

  @Patch('schedule-plans/:id')
  @Permissions(PlatformPermissions.operationsManage)
  updatePlan(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateSchedulePlanDto) {
    return this.schedulingService.updatePlan(id, dto);
  }

  @Post('schedule-plans/:id/publish')
  @Permissions(PlatformPermissions.operationsManage)
  publishPlan(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: PublishSchedulePlanDto,
  ) {
    return this.schedulingService.publishPlan(id, request.principal?.userId, dto);
  }

  @Post('schedule-shifts')
  @Permissions(PlatformPermissions.operationsManage)
  createShift(@Req() request: Request, @Body() dto: CreateScheduleShiftDto) {
    return this.schedulingService.createShift(dto, request.principal?.userId);
  }

  @Get('schedule-shifts')
  @Permissions(PlatformPermissions.operationsRead)
  findShifts(@Query() query: QueryScheduleShiftsDto) {
    return this.schedulingService.findShifts(query);
  }

  @Get('schedule-shifts/:id')
  @Permissions(PlatformPermissions.operationsRead)
  findShift(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.schedulingService.findShift(id);
  }

  @Patch('schedule-shifts/:id')
  @Permissions(PlatformPermissions.operationsManage)
  updateShift(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateScheduleShiftDto) {
    return this.schedulingService.updateShift(id, dto);
  }
}
