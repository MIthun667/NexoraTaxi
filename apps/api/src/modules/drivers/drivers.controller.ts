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
import { CreateDriverDocumentDto } from './dto/create-driver-document.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { QueryDriversDto } from './dto/query-drivers.dto';
import { UpdateDriverDocumentDto } from './dto/update-driver-document.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { DriversService } from './drivers.service';

// Legacy compatibility controller.
// Preferred platform vocabulary for new development is workforce/operators.
// Keep `drivers` routing only for rollback-safe compatibility until retirement is complete.
@Controller(['operators', 'drivers'])
@Permissions(PlatformPermissions.operatorRead)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @Permissions(PlatformPermissions.operatorManage)
  create(@Req() request: Request, @Body() dto: CreateDriverDto) {
    return this.driversService.create(dto, request.principal as CurrentPrincipal);
  }

  @Get()
  findAll(@Query() query: QueryDriversDto) {
    return this.driversService.findAll(query);
  }

  @Get('_parity/summary')
  @Permissions(PlatformPermissions.operatorManage)
  getParitySummary(@Query('organizationId') organizationId?: string) {
    return this.driversService.getParitySummary(organizationId);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.driversService.findOne(id);
  }

  @Patch(':id')
  @Permissions(PlatformPermissions.operatorManage)
  update(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.driversService.update(id, dto, request.principal as CurrentPrincipal);
  }

  @Delete(':id')
  @Permissions(PlatformPermissions.operatorManage)
  archive(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.driversService.archive(id, request.principal as CurrentPrincipal);
  }

  @Post(':id/documents')
  @Permissions(PlatformPermissions.operatorDocumentManage)
  addDocument(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: CreateDriverDocumentDto,
  ) {
    return this.driversService.addDocument(id, dto, request.principal as CurrentPrincipal);
  }

  @Get(':id/documents')
  listDocuments(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.driversService.listDocuments(id);
  }

  @Patch(':id/documents/:documentId')
  @Permissions(PlatformPermissions.operatorDocumentManage)
  updateDocument(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Req() request: Request,
    @Body() dto: UpdateDriverDocumentDto,
  ) {
    return this.driversService.updateDocument(
      id,
      documentId,
      dto,
      request.principal as CurrentPrincipal,
    );
  }

  @Post(':id/status')
  @Permissions(PlatformPermissions.operatorStatusManage)
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: UpdateDriverStatusDto,
  ) {
    return this.driversService.updateStatus(id, request.principal as CurrentPrincipal, dto);
  }

  @Get(':id/status-history')
  findStatusHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.driversService.getStatusHistory(id);
  }
}
