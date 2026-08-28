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
import { ListOperationalZonesQueryDto } from './dto/list-operational-zones-query.dto';
import { UpdateOperationalZoneDto } from './dto/update-operational-zone.dto';
import { OperationalZonesService } from './operational-zones.service';

@Controller('operations/zones')
@Permissions(PlatformPermissions.operationsRead)
export class OperationalZonesController {
  constructor(private readonly operationalZonesService: OperationalZonesService) {}

  @Get()
  findAll(@Req() request: Request, @Query() query: ListOperationalZonesQueryDto) {
    return this.operationalZonesService.listZones(query, request.principal);
  }

  @Post()
  @Permissions(PlatformPermissions.operationsManage)
  create(@Body() dto: CreateOperationalZoneDto) {
    return this.operationalZonesService.createZone(dto);
  }

  @Get(':id')
  findOne(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.operationalZonesService.getZoneDetail(id, request.principal);
  }

  @Patch(':id')
  @Permissions(PlatformPermissions.operationsManage)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOperationalZoneDto,
  ) {
    return this.operationalZonesService.updateZone(id, dto);
  }
}
