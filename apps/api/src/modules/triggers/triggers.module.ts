import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SharedModule } from '../../shared/shared.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { TriggerActionsService } from './trigger-actions.service';
import { TriggerEngineService } from './trigger-engine.service';
import { TriggerEvaluatorService } from './trigger-evaluator.service';
import { TriggerExecutionService } from './trigger-execution.service';
import { TriggerRegistryService } from './trigger-registry.service';
import { TriggerRepository } from './trigger.repository';
import { TriggersPolicyService } from './policies/triggers-policy.service';

@Module({
  imports: [PrismaModule, SharedModule, AuditModule, NotificationsModule],
  providers: [
    TriggerRepository,
    TriggerRegistryService,
    TriggerEvaluatorService,
    TriggerActionsService,
    TriggerExecutionService,
    TriggerEngineService,
    TriggersPolicyService,
  ],
  exports: [TriggerEngineService],
})
export class TriggersModule {}
