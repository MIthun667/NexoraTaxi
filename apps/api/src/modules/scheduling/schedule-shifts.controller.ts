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
import { AllocateShiftCapacityDto } from './dto/allocate-shift-capacity.dto';
import { CreateScheduleShiftDto } from './dto/create-schedule-shift.dto';
import { ListScheduleShiftsQueryDto } from './dto/list-schedule-shifts-query.dto';
import { UpdateScheduleShiftDto } from './dto/update-schedule-shift.dto';
import { UpdateScheduleShiftStatusDto } from './dto/update-schedule-shift-status.dto';
import { ScheduleShiftsQueryService } from './schedule-shifts-query.service';
import { ScheduleShiftsService } from './schedule-shifts.service';
import { ShiftCapacityService } from './shift-capacity.service';
import { ShiftStatusService } from './shift-status.service';

@Controller('scheduling/shifts')
@Permissions(PlatformPermissions.operationsRead)
export class ScheduleShiftsController {
  constructor(
    private readonly scheduleShiftsService: ScheduleShiftsService,
    private readonly scheduleShiftsQueryService: ScheduleShiftsQueryService,
    private readonly shiftStatusService: ShiftStatusService,
    private readonly shiftCapacityService: ShiftCapacityService,
  ) {}

  @Get()
  findAll(@Req() request: Request, @Query() query: ListScheduleShiftsQueryDto) {
    return this.scheduleShiftsQueryService.listShifts(query, request.principal);
  }

  @Post()
  @Permissions(PlatformPermissions.operationsManage)
  create(@Req() request: Request, @Body() dto: CreateScheduleShiftDto) {
    return this.scheduleShiftsService.createShift(dto, request.principal);
  }

  @Get(':id')
  findOne(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.scheduleShiftsQueryService.getShiftDetail(id, request.principal);
  }

  @Patch(':id')
  @Permissions(PlatformPermissions.operationsManage)
  update(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateScheduleShiftDto,
  ) {
    return this.scheduleShiftsService.updateShift(id, dto, request.principal);
  }

  @Post(':id/status')
  @Permissions(PlatformPermissions.operationsManage)
  updateStatus(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateScheduleShiftStatusDto,
  ) {
    return this.shiftStatusService.updateStatus(id, dto, request.principal);
  }

  @Post(':id/capacity')
  @Permissions(PlatformPermissions.operationsManage)
  updateCapacity(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AllocateShiftCapacityDto,
  ) {
    return this.shiftCapacityService.updateCapacity(id, dto, request.principal);
  }
}
