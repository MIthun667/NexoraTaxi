import { Controller, Get, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../common/constants/platform-permissions.constants';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { QueryDecisionReportsDto } from './dto/query-decision-reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@Permissions(PlatformPermissions.intelligenceRead)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  list(@Query() query: QueryDecisionReportsDto) {
    return this.reportsService.list(query);
  }

  @Get('executive-summary')
  getExecutiveSummary(@Req() request: Request) {
    return this.reportsService.getExecutiveSummary(request.principal?.organizationId);
  }

  @Get('agent-run/:runId')
  getByAgentRun(@Param('runId', new ParseUUIDPipe()) runId: string) {
    return this.reportsService.findByAgentRun(runId);
  }

  @Get(':id')
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reportsService.findOne(id);
  }
}
