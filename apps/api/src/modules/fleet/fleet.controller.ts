import {
  Body,
  Controller,
  Delete,
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
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { CreateFleetVehicleDto } from './dto/create-fleet-vehicle.dto';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { QueryFleetVehiclesDto } from './dto/query-fleet-vehicles.dto';
import { UpdateFleetStatusDto } from './dto/update-fleet-status.dto';
import { UpdateFleetVehicleDto } from './dto/update-fleet-vehicle.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { FleetService } from './fleet.service';

// Legacy compatibility controller.
// Preferred platform vocabulary for new development is assets/asset maintenance.
// Keep `fleet` aliases mounted only for backward compatibility.
@Controller(['assets', 'fleet'])
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Post('vehicles')
  @Permissions(PlatformPermissions.assetManage)
  createVehicle(@Body() dto: CreateFleetVehicleDto) {
    return this.fleetService.createVehicle(dto);
  }

  @Get('vehicles')
  @Permissions(PlatformPermissions.assetRead)
  findAllVehicles(@Query() query: QueryFleetVehiclesDto) {
    return this.fleetService.findAllVehicles(query);
  }

  @Get('vehicles/:id')
  @Permissions(PlatformPermissions.assetRead)
  findVehicle(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.fleetService.findVehicle(id);
  }

  @Patch('vehicles/:id')
  @Permissions(PlatformPermissions.assetManage)
  updateVehicle(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateFleetVehicleDto,
  ) {
    return this.fleetService.updateVehicle(id, dto);
  }

  @Delete('vehicles/:id')
  @Permissions(PlatformPermissions.assetManage)
  archiveVehicle(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.fleetService.archiveVehicle(id);
  }

  @Post('vehicles/:id/maintenance-records')
  @Permissions(PlatformPermissions.assetMaintenanceManage)
  addMaintenanceRecord(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateMaintenanceRecordDto,
  ) {
    return this.fleetService.addMaintenanceRecord(id, dto);
  }

  @Get('vehicles/:id/maintenance-records')
  @Permissions(PlatformPermissions.assetRead)
  listMaintenanceRecords(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.fleetService.listMaintenanceRecords(id);
  }

  @Patch('vehicles/:id/maintenance-records/:recordId')
  @Permissions(PlatformPermissions.assetMaintenanceManage)
  updateMaintenanceRecord(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('recordId', new ParseUUIDPipe()) recordId: string,
    @Body() dto: UpdateMaintenanceRecordDto,
  ) {
    return this.fleetService.updateMaintenanceRecord(id, recordId, dto);
  }

  @Post('vehicles/:id/status')
  @Permissions(PlatformPermissions.assetStatusManage)
  updateVehicleStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: UpdateFleetStatusDto,
  ) {
    return this.fleetService.updateVehicleStatus(
      id,
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Get('vehicles/:id/status-history')
  @Permissions(PlatformPermissions.assetRead)
  getVehicleStatusHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.fleetService.getVehicleStatusHistory(id);
  }
}
