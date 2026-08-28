import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../common/constants/platform-permissions.constants';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { AgentsService } from './agents.service';
import { OrchestrateCommerceAgentsDto } from './dto/orchestrate-commerce-agents.dto';
import { QueryAgentTriggersDto } from './dto/query-agent-triggers.dto';
import { QueryCommerceAgentRunsDto } from './dto/query-commerce-agent-runs.dto';
import { RunCommerceAgentDto } from './dto/run-commerce-agent.dto';

@Controller('ai/agents')
export class AiAgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @Permissions(PlatformPermissions.intelligenceRead)
  listDefinitions() {
    return this.agentsService.listCommerceDefinitions();
  }

  @Get('runs')
  @Permissions(PlatformPermissions.intelligenceRead)
  listRuns(@Req() request: Request, @Query() query: QueryCommerceAgentRunsDto) {
    return this.agentsService.listCommerceRuns(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('runs/:id')
  @Permissions(PlatformPermissions.intelligenceRead)
  getRun(@Req() request: Request, @Param('id') id: string) {
    return this.agentsService.getCommerceRun(
      request.principal as CurrentPrincipal,
      id,
    );
  }

  @Get('triggers')
  @Permissions(PlatformPermissions.intelligenceRead)
  listTriggers(@Req() request: Request, @Query() query: QueryAgentTriggersDto) {
    return this.agentsService.listTriggers(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('triggers/:id')
  @Permissions(PlatformPermissions.intelligenceRead)
  getTrigger(@Req() request: Request, @Param('id') id: string) {
    return this.agentsService.getTrigger(
      request.principal as CurrentPrincipal,
      id,
    );
  }

  @Post('orchestrate')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  orchestrate(@Req() request: Request, @Body() dto: OrchestrateCommerceAgentsDto) {
    return this.agentsService.orchestrate(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post(':key/run')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  runAgent(
    @Req() request: Request,
    @Param('key') key: string,
    @Body() dto: RunCommerceAgentDto,
  ) {
    return this.agentsService.runCommerceAgent(
      request.principal as CurrentPrincipal,
      key,
      dto,
    );
  }
}
