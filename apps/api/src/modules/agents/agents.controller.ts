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
import { AgentsService } from './agents.service';
import { CreateAgentRunDto } from './dto/create-agent-run.dto';
import { QueryAgentActionProposalsDto } from './dto/query-agent-action-proposals.dto';
import { QueryAgentDefinitionsDto } from './dto/query-agent-definitions.dto';
import { QueryAgentRunsDto } from './dto/query-agent-runs.dto';
import { ReviewAgentActionProposalDto } from './dto/review-agent-action-proposal.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get('definitions')
  @Permissions(PlatformPermissions.agentRead)
  listDefinitions(@Query() query: QueryAgentDefinitionsDto) {
    return this.agentsService.listDefinitions(query);
  }

  @Get('definitions/:id')
  @Permissions(PlatformPermissions.agentRead)
  getDefinition(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.agentsService.getDefinition(id);
  }

  @Post('runs')
  @Permissions(PlatformPermissions.agentRun)
  createRun(@Req() request: Request, @Body() dto: CreateAgentRunDto) {
    return this.agentsService.createRun(request.principal as CurrentPrincipal, dto);
  }

  @Post('run')
  @Permissions(PlatformPermissions.agentRun)
  createRunAlias(@Req() request: Request, @Body() dto: CreateAgentRunDto) {
    return this.agentsService.createRun(request.principal as CurrentPrincipal, dto);
  }

  @Get('runs')
  @Permissions(PlatformPermissions.agentRead)
  listRuns(@Req() request: Request, @Query() query: QueryAgentRunsDto) {
    return this.agentsService.listRuns(request.principal as CurrentPrincipal, query);
  }

  @Get('runs/:id')
  @Permissions(PlatformPermissions.agentRead)
  getRun(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.agentsService.getRun(request.principal as CurrentPrincipal, id);
  }

  @Get('runs/:id/observations')
  @Permissions(PlatformPermissions.agentRead)
  getRunObservations(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.agentsService.getRunObservations(
      request.principal as CurrentPrincipal,
      id,
    );
  }

  @Get('runs/:id/decisions')
  @Permissions(PlatformPermissions.agentRead)
  getRunDecisions(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.agentsService.getRunDecisions(request.principal as CurrentPrincipal, id);
  }

  @Get('runs/:id/action-proposals')
  @Permissions(PlatformPermissions.agentRead)
  getRunActionProposals(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.agentsService.getRunActionProposals(
      request.principal as CurrentPrincipal,
      id,
    );
  }

  @Get('action-proposals')
  @Permissions(PlatformPermissions.agentRead)
  listActionProposals(@Req() request: Request, @Query() query: QueryAgentActionProposalsDto) {
    return this.agentsService.listActionProposals(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('action-proposals/:id/review')
  @Permissions(PlatformPermissions.agentReview)
  reviewActionProposal(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReviewAgentActionProposalDto,
  ) {
    return this.agentsService.reviewActionProposal(
      request.principal as CurrentPrincipal,
      id,
      dto,
    );
  }
}
