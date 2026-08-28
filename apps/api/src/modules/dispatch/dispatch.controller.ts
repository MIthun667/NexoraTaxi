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
} from '@nestjs/common';

import { PlatformPermissions } from '../../common/constants/platform-permissions.constants';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateDispatchIncidentDto } from './dto/create-dispatch-incident.dto';
import { CreateDispatchRunDto } from './dto/create-dispatch-run.dto';
import { CreateDispatchShiftDto } from './dto/create-dispatch-shift.dto';
import { CreateDispatchZoneDto } from './dto/create-dispatch-zone.dto';
import { CreateDriverVehicleAssignmentDto } from './dto/create-driver-vehicle-assignment.dto';
import { QueryDispatchIncidentsDto } from './dto/query-dispatch-incidents.dto';
import { QueryDispatchRunsDto } from './dto/query-dispatch-runs.dto';
import { QueryDispatchShiftsDto } from './dto/query-dispatch-shifts.dto';
import { QueryDispatchZonesDto } from './dto/query-dispatch-zones.dto';
import { QueryDriverVehicleAssignmentsDto } from './dto/query-driver-vehicle-assignments.dto';
import { UpdateDispatchIncidentDto } from './dto/update-dispatch-incident.dto';
import { UpdateDispatchRunDto } from './dto/update-dispatch-run.dto';
import { UpdateDispatchShiftDto } from './dto/update-dispatch-shift.dto';
import { UpdateDispatchZoneDto } from './dto/update-dispatch-zone.dto';
import { UpdateDriverVehicleAssignmentDto } from './dto/update-driver-vehicle-assignment.dto';
import { DispatchService } from './dispatch.service';

// Legacy compatibility controller.
// Preferred platform vocabulary for new development is operations/scheduling/assignments/incidents.
// Keep `dispatch` aliases mounted only for backward compatibility.
@Controller(['operations', 'dispatch'])
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post('zones')
  @Permissions(PlatformPermissions.operationsManage)
  createZone(@Body() dto: CreateDispatchZoneDto) {
    return this.dispatchService.createZone(dto);
  }

  @Get('zones')
  @Permissions(PlatformPermissions.operationsRead)
  listZones(@Query() query: QueryDispatchZonesDto) {
    return this.dispatchService.listZones(query);
  }

  @Get('_parity/summary')
  @Permissions(PlatformPermissions.operationsManage)
  getParitySummary(@Query('organizationId') organizationId?: string) {
    return this.dispatchService.getParitySummary(organizationId);
  }

  @Get('zones/:id')
  @Permissions(PlatformPermissions.operationsRead)
  getZone(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.dispatchService.getZone(id);
  }

  @Patch('zones/:id')
  @Permissions(PlatformPermissions.operationsManage)
  updateZone(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDispatchZoneDto,
  ) {
    return this.dispatchService.updateZone(id, dto);
  }

  @Post('shifts')
  @Permissions(PlatformPermissions.operationsManage)
  createShift(@Body() dto: CreateDispatchShiftDto) {
    return this.dispatchService.createShift(dto);
  }

  @Get('shifts')
  @Permissions(PlatformPermissions.operationsRead)
  listShifts(@Query() query: QueryDispatchShiftsDto) {
    return this.dispatchService.listShifts(query);
  }

  @Get('shifts/:id')
  @Permissions(PlatformPermissions.operationsRead)
  getShift(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.dispatchService.getShift(id);
  }

  @Patch('shifts/:id')
  @Permissions(PlatformPermissions.operationsManage)
  updateShift(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDispatchShiftDto,
  ) {
    return this.dispatchService.updateShift(id, dto);
  }

  @Delete('shifts/:id')
  @Permissions(PlatformPermissions.operationsManage)
  archiveShift(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.dispatchService.archiveShift(id);
  }

  @Post('assignments')
  @Permissions(PlatformPermissions.operationsAssignmentManage)
  createAssignment(@Body() dto: CreateDriverVehicleAssignmentDto) {
    return this.dispatchService.createAssignment(dto);
  }

  @Get('assignments')
  @Permissions(PlatformPermissions.operationsRead)
  listAssignments(@Query() query: QueryDriverVehicleAssignmentsDto) {
    return this.dispatchService.listAssignments(query);
  }

  @Get('assignments/:id')
  @Permissions(PlatformPermissions.operationsRead)
  getAssignment(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.dispatchService.getAssignment(id);
  }

  @Patch('assignments/:id')
  @Permissions(PlatformPermissions.operationsAssignmentManage)
  updateAssignment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDriverVehicleAssignmentDto,
  ) {
    return this.dispatchService.updateAssignment(id, dto);
  }

  @Post('assignments/:id/release')
  @Permissions(PlatformPermissions.operationsAssignmentManage)
  releaseAssignment(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.dispatchService.releaseAssignment(id);
  }

  @Post('runs')
  @Permissions(PlatformPermissions.operationsRunManage)
  createRun(@Body() dto: CreateDispatchRunDto) {
    return this.dispatchService.createRun(dto);
  }

  @Get('runs')
  @Permissions(PlatformPermissions.operationsRead)
  listRuns(@Query() query: QueryDispatchRunsDto) {
    return this.dispatchService.listRuns(query);
  }

  @Get('runs/:id')
  @Permissions(PlatformPermissions.operationsRead)
  getRun(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.dispatchService.getRun(id);
  }

  @Patch('runs/:id')
  @Permissions(PlatformPermissions.operationsRunManage)
  updateRun(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDispatchRunDto,
  ) {
    return this.dispatchService.updateRun(id, dto);
  }

  @Post('incidents')
  @Permissions(PlatformPermissions.operationsIssueManage)
  createIncident(@Body() dto: CreateDispatchIncidentDto) {
    return this.dispatchService.createIncident(dto);
  }

  @Get('incidents')
  @Permissions(PlatformPermissions.operationsRead)
  listIncidents(@Query() query: QueryDispatchIncidentsDto) {
    return this.dispatchService.listIncidents(query);
  }

  @Get('incidents/:id')
  @Permissions(PlatformPermissions.operationsRead)
  getIncident(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.dispatchService.getIncident(id);
  }

  @Patch('incidents/:id')
  @Permissions(PlatformPermissions.operationsIssueManage)
  updateIncident(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDispatchIncidentDto,
  ) {
    return this.dispatchService.updateIncident(id, dto);
  }
}
