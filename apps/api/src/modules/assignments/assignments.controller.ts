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
import { AssignmentConflictService } from './assignment-conflict.service';
import { AssignmentStatusService } from './assignment-status.service';
import { AssignmentsQueryService } from './assignments-query.service';
import { AssignmentsService } from './assignments.service';
import { CreateResourceAssignmentDto } from './dto/create-resource-assignment.dto';
import { ListResourceAssignmentsQueryDto } from './dto/list-resource-assignments-query.dto';
import { ReleaseResourceAssignmentDto } from './dto/release-resource-assignment.dto';
import { UpdateResourceAssignmentDto } from './dto/update-resource-assignment.dto';
import { UpdateResourceAssignmentStatusDto } from './dto/update-resource-assignment-status.dto';
import { ValidateAssignmentConflictsDto } from './dto/validate-assignment-conflicts.dto';

@Controller('assignments')
@Permissions(PlatformPermissions.operationsRead)
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly assignmentsQueryService: AssignmentsQueryService,
    private readonly assignmentStatusService: AssignmentStatusService,
    private readonly assignmentConflictService: AssignmentConflictService,
  ) {}

  @Post()
  @Permissions(PlatformPermissions.operationsAssignmentManage)
  create(@Req() request: Request, @Body() dto: CreateResourceAssignmentDto) {
    return this.assignmentsService.create(dto, request.principal);
  }

  @Get()
  findAll(@Req() request: Request, @Query() query: ListResourceAssignmentsQueryDto) {
    return this.assignmentsQueryService.listAssignments(query, request.principal);
  }

  @Get(':id')
  findOne(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.assignmentsQueryService.getAssignmentDetail(id, request.principal);
  }

  @Patch(':id')
  @Permissions(PlatformPermissions.operationsAssignmentManage)
  update(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateResourceAssignmentDto,
    ) {
    return this.assignmentsService.update(id, dto, request.principal);
  }

  @Post('validate-conflicts')
  @Permissions(PlatformPermissions.operationsAssignmentManage)
  validateConflicts(
    @Req() request: Request,
    @Body() dto: ValidateAssignmentConflictsDto,
  ) {
    return this.assignmentConflictService.validateConflicts(dto, request.principal);
  }

  @Post(':id/status')
  @Permissions(PlatformPermissions.operationsAssignmentManage)
  updateStatus(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateResourceAssignmentStatusDto,
  ) {
    return this.assignmentStatusService.updateStatus(id, dto, request.principal);
  }

  @Post(':id/release')
  @Permissions(PlatformPermissions.operationsAssignmentManage)
  release(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: ReleaseResourceAssignmentDto,
  ) {
    return this.assignmentsService.release(id, dto, request.principal);
  }
}
