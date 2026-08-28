import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { ObservabilityModule } from '../observability/observability.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [PrismaModule, ObservabilityModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
