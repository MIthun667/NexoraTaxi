import { Controller, Get } from '@nestjs/common';

import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  getHealthStatus() {
    return this.healthService.getHealthStatus();
  }

  @Get('liveness')
  @Public()
  getLivenessStatus() {
    return this.healthService.getLivenessStatus();
  }

  @Get('readiness')
  @Public()
  getReadinessStatus() {
    return this.healthService.getReadinessStatus();
  }

  @Get('database')
  getDatabaseHealth() {
    return this.healthService.getDatabaseHealth();
  }

  @Get('ai-runtime')
  getAiRuntimeHealth() {
    return this.healthService.getAiRuntimeHealth();
  }

  @Get('connectors')
  getConnectorsHealth() {
    return this.healthService.getConnectorsHealth();
  }
}
