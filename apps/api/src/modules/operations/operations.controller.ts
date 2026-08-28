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
import { CreateOperationalZoneDto } from './dto/create-operational-zone.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { QueryOperationalZonesDto } from './dto/query-operational-zones.dto';
import { QueryOperationalTasksDto } from './dto/query-operational-tasks.dto';
import { QueryWorkOrdersDto } from './dto/query-work-orders.dto';
import { TransitionWorkOrderStatusDto } from './dto/transition-work-order-status.dto';
import { UpdateOperationalZoneDto } from './dto/update-operational-zone.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { OperationsService } from './operations.service';

@Controller()
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Post('operations/zones')
  @Permissions(PlatformPermissions.operationsManage)
  createZone(@Body() dto: CreateOperationalZoneDto) {
    return this.operationsService.createZone(dto);
  }

  @Get('operations/zones')
  @Permissions(PlatformPermissions.operationsRead)
  findZones(@Query() query: QueryOperationalZonesDto) {
    return this.operationsService.findZones(query);
  }

  @Get('operations/zones/:id')
  @Permissions(PlatformPermissions.operationsRead)
  findZone(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.operationsService.findZone(id);
  }

  @Get('operations/tasks')
  @Permissions(PlatformPermissions.operationsRead)
  findOperationalTasks(@Query() query: QueryOperationalTasksDto) {
    return this.operationsService.listOperationalTasks(query);
  }

  @Get('operations/tasks/:id')
  @Permissions(PlatformPermissions.operationsRead)
  findOperationalTask(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.operationsService.getOperationalTaskById(id);
  }

  @Patch('operations/zones/:id')
  @Permissions(PlatformPermissions.operationsManage)
  updateZone(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOperationalZoneDto,
  ) {
    return this.operationsService.updateZone(id, dto);
  }

  @Post('work-orders')
  @Permissions(PlatformPermissions.operationsManage)
  createWorkOrder(@Req() request: Request, @Body() dto: CreateWorkOrderDto) {
    return this.operationsService.createWorkOrder(request.principal?.userId, dto);
  }

  @Get('work-orders')
  @Permissions(PlatformPermissions.operationsRead)
  findWorkOrders(@Query() query: QueryWorkOrdersDto) {
    return this.operationsService.findWorkOrders(query);
  }

  @Get('work-orders/:id')
  @Permissions(PlatformPermissions.operationsRead)
  findWorkOrder(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.operationsService.findWorkOrder(id);
  }

  @Patch('work-orders/:id')
  @Permissions(PlatformPermissions.operationsManage)
  updateWorkOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.operationsService.updateWorkOrder(id, dto);
  }

  @Post('work-orders/:id/status')
  @Permissions(PlatformPermissions.operationsManage)
  transitionStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: TransitionWorkOrderStatusDto,
  ) {
    return this.operationsService.transitionWorkOrderStatus(id, request.principal?.userId, dto);
  }
}
