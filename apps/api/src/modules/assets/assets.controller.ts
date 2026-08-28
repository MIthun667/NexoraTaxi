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
import { AssetMaintenanceService } from './asset-maintenance.service';
import { AssetStatusService } from './asset-status.service';
import { AssetsQueryService } from './assets-query.service';
import { AssetsService } from './assets.service';
import { CreateAssetMaintenanceRecordDto } from './dto/create-asset-maintenance-record.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { ListAssetsQueryDto } from './dto/list-assets-query.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateAssetMaintenanceRecordDto } from './dto/update-asset-maintenance-record.dto';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto';

@Controller('assets')
@Permissions(PlatformPermissions.assetRead)
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly assetsQueryService: AssetsQueryService,
    private readonly assetStatusService: AssetStatusService,
    private readonly assetMaintenanceService: AssetMaintenanceService,
  ) {}

  @Post()
  @Permissions(PlatformPermissions.assetManage)
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListAssetsQueryDto) {
    return this.assetsService.listAssets(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.assetsService.getAssetById(id);
  }

  @Patch(':id')
  @Permissions(PlatformPermissions.assetManage)
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PlatformPermissions.assetManage)
  archive(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.assetsService.archive(id);
  }

  @Post(':id/maintenance')
  @Permissions(PlatformPermissions.assetMaintenanceManage)
  addMaintenanceRecord(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: CreateAssetMaintenanceRecordDto,
  ) {
    return this.assetMaintenanceService.createMaintenanceRecord(id, dto, request.principal);
  }

  @Get(':id/maintenance')
  listMaintenanceRecords(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.assetMaintenanceService.listMaintenanceRecords(id, request.principal);
  }

  @Patch('maintenance/:maintenanceId')
  @Permissions(PlatformPermissions.assetMaintenanceManage)
  updateMaintenanceRecord(
    @Req() request: Request,
    @Param('maintenanceId', new ParseUUIDPipe()) maintenanceId: string,
    @Body() dto: UpdateAssetMaintenanceRecordDto,
  ) {
    return this.assetMaintenanceService.updateMaintenanceRecord(
      maintenanceId,
      dto,
      request.principal,
    );
  }

  @Post(':id/status')
  @Permissions(PlatformPermissions.assetStatusManage)
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: UpdateAssetStatusDto,
  ) {
    return this.assetStatusService.updateStatus(id, dto, request.principal);
  }

  @Get(':id/status-history')
  getStatusHistory(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.assetsQueryService.getAssetHistory(id, request.principal);
  }

  @Get(':id/history')
  getHistory(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.assetsQueryService.getAssetHistory(id, request.principal);
  }
}
