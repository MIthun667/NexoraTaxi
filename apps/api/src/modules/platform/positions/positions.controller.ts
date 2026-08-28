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

import { PlatformPermissions } from '../../../common/constants/platform-permissions.constants';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CreatePositionDto } from './dto/create-position.dto';
import { QueryPositionsDto } from './dto/query-positions.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionsService } from './positions.service';

@Controller('positions')
@Permissions(PlatformPermissions.positionRead)
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Post()
  @Permissions(PlatformPermissions.positionManage)
  create(@Body() createPositionDto: CreatePositionDto) {
    return this.positionsService.create(createPositionDto);
  }

  @Get()
  findAll(@Query() query: QueryPositionsDto) {
    return this.positionsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.positionsService.findOne(id);
  }

  @Patch(':id')
  @Permissions(PlatformPermissions.positionManage)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updatePositionDto: UpdatePositionDto,
  ) {
    return this.positionsService.update(id, updatePositionDto);
  }

  @Delete(':id')
  @Permissions(PlatformPermissions.positionManage)
  archive(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.positionsService.archive(id);
  }
}
