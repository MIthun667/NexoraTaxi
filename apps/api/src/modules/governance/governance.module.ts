import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiAuditTraceService } from './ai-audit-trace.service';
import { AiHealthService } from './ai-health.service';
import { AiMetricsService } from './ai-metrics.service';
import { AiObservabilityService } from './ai-observability.service';
import { AiPolicyMonitorService } from './ai-policy-monitor.service';
import { GovernanceRepository } from './governance.repository';
import { GovernancePolicyService } from './policies/governance-policy.service';

@Module({
  imports: [PrismaModule, AuditModule, NotificationsModule, IntelligenceModule],
  providers: [
    GovernanceRepository,
    GovernancePolicyService,
    AiObservabilityService,
    AiMetricsService,
    AiPolicyMonitorService,
    AiAuditTraceService,
    AiHealthService,
  ],
  exports: [
    AiObservabilityService,
    AiMetricsService,
    AiPolicyMonitorService,
    AiAuditTraceService,
    AiHealthService,
  ],
})
export class GovernanceModule {}
