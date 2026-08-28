import { Module } from '@nestjs/common';

import { ApprovalsModule } from '../approvals/approvals.module';
import { AssetsModule } from '../assets/assets.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { AuditModule } from '../audit/audit.module';
import { AgentsModule } from '../agents/agents.module';
import { GovernanceModule } from '../governance/governance.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ShopifyModule } from '../integrations/shopify/shopify.module';
import { VerificationModule } from '../agents/verification/verification.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ObservabilityModule } from '../observability/observability.module';
import { OperationsModule } from '../operations/operations.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { WorkforceModule } from '../workforce/workforce.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { ActionAuditService } from './action-audit.service';
import { ActionDispatcherService } from './action-dispatcher.service';
import { ActionExecutionService } from './action-execution.service';
import { ActionPolicyService } from './action-policy.service';
import { ActionRegistryService } from './action-registry.service';
import { ActionRepository } from './action.repository';
import { ActionPolicyRulesService } from './policies/action-policy-rules.service';
import { AssignmentActionHandler } from './handlers/assignment-action.handler';
import { AssetActionHandler } from './handlers/asset-action.handler';
import { IncidentActionHandler } from './handlers/incident-action.handler';
import { NotificationActionHandler } from './handlers/notification-action.handler';
import { OperationsActionHandler } from './handlers/operations-action.handler';
import { SchedulingActionHandler } from './handlers/scheduling-action.handler';
import { WorkforceActionHandler } from './handlers/workforce-action.handler';
import { GovernanceActionHandler } from './handlers/governance-action.handler';
import { CommerceActionHandler } from './handlers/commerce-action.handler';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationsModule,
    IntegrationsModule,
    ShopifyModule,
    ApprovalsModule,
    WorkforceModule,
    AssetsModule,
    OperationsModule,
    SchedulingModule,
    WorkflowsModule,
    IncidentsModule,
    AssignmentsModule,
    AgentsModule,
    VerificationModule,
    GovernanceModule,
    ObservabilityModule,
  ],
  providers: [
    ActionRepository,
    ActionAuditService,
    ActionPolicyRulesService,
    ActionPolicyService,
    WorkforceActionHandler,
    AssetActionHandler,
    OperationsActionHandler,
    SchedulingActionHandler,
    IncidentActionHandler,
    AssignmentActionHandler,
    NotificationActionHandler,
    GovernanceActionHandler,
    CommerceActionHandler,
    ActionRegistryService,
    ActionDispatcherService,
    ActionExecutionService,
  ],
  exports: [ActionExecutionService],
})
export class ActionsModule {}
