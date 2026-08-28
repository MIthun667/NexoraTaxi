import { Module } from '@nestjs/common';

import { SharedModule } from '../../shared/shared.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { GovernanceModule } from '../governance/governance.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { ConnectorsRepository } from '../integrations/connectors.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { ObservabilityController } from './observability.controller';
import { AlertingService } from './alerting.service';
import { ObservabilityHealthService } from './health.service';
import { IncidentMonitorService } from './incident-monitor.service';
import { LoggingService } from './logging.service';
import { MetricsService } from './metrics.service';
import { ObservabilityRepository } from './observability.repository';
import { TracingService } from './tracing.service';

@Module({
  imports: [PrismaModule, SharedModule, GovernanceModule, IntelligenceModule, NotificationsModule],
  controllers: [ObservabilityController],
  providers: [
    ConnectorsRepository,
    ObservabilityRepository,
    LoggingService,
    TracingService,
    MetricsService,
    ObservabilityHealthService,
    AlertingService,
    IncidentMonitorService,
  ],
  exports: [
    LoggingService,
    TracingService,
    MetricsService,
    ObservabilityHealthService,
    AlertingService,
    IncidentMonitorService,
  ],
})
export class ObservabilityModule {}
