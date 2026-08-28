import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { buildSuccessResponse } from '../../shared/responses/response.util';
import { MetricsService } from './metrics.service';
import { ObservabilityRepository } from './observability.repository';
import { ObservabilityHealthService } from './health.service';

@Controller('observability')
export class ObservabilityController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly observabilityRepository: ObservabilityRepository,
    private readonly observabilityHealthService: ObservabilityHealthService,
  ) {}

  @Get('summary')
  async getSummary(@Req() request: Request) {
    const organizationId = request.principal?.organizationId ?? request.user?.organizationId ?? null;
    const data = await this.metricsService.getSummary(organizationId);
    return buildSuccessResponse('Observability summary retrieved successfully.', data);
  }

  @Get('alerts')
  async getAlerts(@Req() request: Request, @Query('limit') limit?: string) {
    const organizationId = request.principal?.organizationId ?? request.user?.organizationId ?? null;
    const items = await this.observabilityRepository.listRecentAlerts(
      organizationId,
      limit ? Number(limit) || 25 : 25,
    );
    return buildSuccessResponse('Recent alerts retrieved successfully.', items);
  }

  @Get('health')
  async getHealth(@Req() request: Request) {
    const organizationId = request.principal?.organizationId ?? request.user?.organizationId ?? null;
    const data = await this.observabilityHealthService.getPlatformHealth(organizationId);
    return buildSuccessResponse('Observability health retrieved successfully.', data);
  }
}
