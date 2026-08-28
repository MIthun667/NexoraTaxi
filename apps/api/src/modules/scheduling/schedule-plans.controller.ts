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
import { ListSchedulePlansQueryDto } from './dto/list-schedule-plans-query.dto';
import { PublishSchedulePlanDto } from './dto/publish-schedule-plan.dto';
import { UpdateSchedulePlanDto } from './dto/update-schedule-plan.dto';
import { SchedulePlansService } from './schedule-plans.service';

@Controller('scheduling/plans')
@Permissions(PlatformPermissions.operationsRead)
export class SchedulePlansController {
  constructor(private readonly schedulePlansService: SchedulePlansService) {}

  @Get()
  findAll(@Req() request: Request, @Query() query: ListSchedulePlansQueryDto) {
    return this.schedulePlansService.listPlans(query, request.principal);
  }

  @Post()
  @Permissions(PlatformPermissions.operationsManage)
  create(@Req() request: Request, @Body() dto: CreateSchedulePlanDto) {
    return this.schedulePlansService.createPlan(dto, request.principal);
  }

  @Get(':id')
  findOne(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.schedulePlansService.getPlanDetail(id, request.principal);
  }

  @Patch(':id')
  @Permissions(PlatformPermissions.operationsManage)
  update(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSchedulePlanDto,
  ) {
    return this.schedulePlansService.updatePlan(id, dto, request.principal);
  }

  @Post(':id/publish')
  @Permissions(PlatformPermissions.operationsManage)
  publish(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: PublishSchedulePlanDto,
  ) {
    return this.schedulePlansService.publishPlan(id, dto, request.principal);
  }
}
