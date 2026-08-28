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
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { ListWorkOrdersQueryDto } from './dto/list-work-orders-query.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { UpdateWorkOrderStatusDto } from './dto/update-work-order-status.dto';
import { WorkOrderStatusService } from './work-order-status.service';
import { WorkOrdersQueryService } from './work-orders-query.service';
import { WorkOrdersService } from './work-orders.service';

@Controller('operations/work-orders')
@Permissions(PlatformPermissions.operationsRead)
export class WorkOrdersController {
  constructor(
    private readonly workOrdersService: WorkOrdersService,
    private readonly workOrdersQueryService: WorkOrdersQueryService,
    private readonly workOrderStatusService: WorkOrderStatusService,
  ) {}

  @Get()
  findAll(@Req() request: Request, @Query() query: ListWorkOrdersQueryDto) {
    return this.workOrdersQueryService.listWorkOrders(query, request.principal);
  }

  @Post()
  @Permissions(PlatformPermissions.operationsManage)
  create(@Req() request: Request, @Body() dto: CreateWorkOrderDto) {
    return this.workOrdersService.createWorkOrder(dto, request.principal);
  }

  @Get(':id')
  findOne(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.workOrdersQueryService.getWorkOrderDetail(id, request.principal);
  }

  @Patch(':id')
  @Permissions(PlatformPermissions.operationsManage)
  update(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.workOrdersService.updateWorkOrder(id, dto, request.principal);
  }

  @Post(':id/status')
  @Permissions(PlatformPermissions.operationsManage)
  updateStatus(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWorkOrderStatusDto,
  ) {
    return this.workOrderStatusService.updateStatus(id, dto, request.principal);
  }
}
