import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../common/constants/platform-permissions.constants';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ActOnTaskDto } from './dto/act-on-task.dto';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { CreateWorkflowInstanceDto } from './dto/create-workflow-instance.dto';
import { QueryWorkflowTasksDto } from './dto/query-workflow-tasks.dto';
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post('definitions')
  @Permissions(PlatformPermissions.workflowDefinitionManage)
  createDefinition(@Body() dto: CreateWorkflowDefinitionDto) {
    return this.workflowsService.createDefinition(dto);
  }

  @Get('definitions')
  @Permissions(PlatformPermissions.workflowRead)
  listDefinitions(@Query() query: PaginationQueryDto) {
    return this.workflowsService.listDefinitions(query);
  }

  @Get('definitions/:id')
  @Permissions(PlatformPermissions.workflowRead)
  getDefinition(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.workflowsService.getDefinition(id);
  }

  @Post('instances')
  @Permissions(PlatformPermissions.workflowManage)
  createInstance(@Body() dto: CreateWorkflowInstanceDto) {
    return this.workflowsService.createInstance(dto);
  }

  @Get('instances/:id')
  @Permissions(PlatformPermissions.workflowRead)
  getInstance(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.workflowsService.getInstance(id);
  }

  @Get('tasks/my')
  @Permissions(PlatformPermissions.workflowRead)
  getMyTasks(@Req() request: Request, @Query() query: QueryWorkflowTasksDto) {
    return this.workflowsService.getMyTasks(request.principal as CurrentPrincipal, query);
  }

  @Get('tasks/:id')
  @Permissions(PlatformPermissions.workflowRead)
  getTask(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.workflowsService.getTask(id);
  }

  @Post('tasks/:id/actions')
  @Permissions(PlatformPermissions.workflowAct)
  actOnTask(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: ActOnTaskDto,
  ) {
    return this.workflowsService.actOnTask(
      id,
      request.principal as CurrentPrincipal,
      dto,
    );
  }
}
