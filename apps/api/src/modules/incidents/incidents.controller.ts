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
import { CreateIncidentActionDto } from './dto/create-incident-action.dto';
import { CreateOperationalIncidentDto } from './dto/create-operational-incident.dto';
import { QueryOperationalIncidentsDto } from './dto/query-operational-incidents.dto';
import { ResolveIncidentDto } from './dto/resolve-incident.dto';
import { UpdateOperationalIncidentDto } from './dto/update-operational-incident.dto';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
@Permissions(PlatformPermissions.operationsRead)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @Permissions(PlatformPermissions.operationsIssueManage)
  create(@Req() request: Request, @Body() dto: CreateOperationalIncidentDto) {
    return this.incidentsService.create(request.principal?.userId, dto);
  }

  @Get()
  findAll(@Query() query: QueryOperationalIncidentsDto) {
    return this.incidentsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id')
  @Permissions(PlatformPermissions.operationsIssueManage)
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateOperationalIncidentDto) {
    return this.incidentsService.update(id, dto);
  }

  @Post(':id/actions')
  @Permissions(PlatformPermissions.operationsIssueManage)
  addAction(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: CreateIncidentActionDto,
  ) {
    return this.incidentsService.addAction(id, request.principal?.userId, dto);
  }

  @Post(':id/resolve')
  @Permissions(PlatformPermissions.operationsIssueManage)
  resolve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: ResolveIncidentDto,
  ) {
    return this.incidentsService.resolve(id, request.principal?.userId, dto);
  }
}
