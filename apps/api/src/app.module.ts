import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { PermissionsGuard } from './common/guards/permissions.guard';
import { PlatformAuthGuard } from './common/guards/platform-auth.guard';
import { AuthRateLimitMiddleware } from './common/middleware/auth-rate-limit.middleware';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import environmentConfig from './config/environment.config';
import { validationSchema } from './config/validation.schema';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthzModule } from './modules/authz/authz.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { AgentsModule } from './modules/agents/agents.module';
import { ActionsModule } from './modules/actions/actions.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { HealthModule } from './modules/health/health.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { KnowledgeGraphModule } from './modules/knowledge-graph/knowledge-graph.module';
import { CrmModule } from './modules/crm/crm.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { OperationsModule } from './modules/operations/operations.module';
import { RetrievalModule } from './modules/retrieval/retrieval.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { DepartmentsModule } from './modules/platform/departments/departments.module';
import { EmployeesModule } from './modules/platform/employees/employees.module';
import { OrganizationsModule } from './modules/platform/organizations/organizations.module';
import { PositionsModule } from './modules/platform/positions/positions.module';
import { PeopleModule } from './modules/people/people.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { TriggersModule } from './modules/triggers/triggers.module';
import { WorkforceModule } from './modules/workforce/workforce.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { TenantGuard } from './modules/tenancy/tenant-guard';
import { PrismaModule } from './prisma/prisma.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      load: [environmentConfig],
      validationSchema,
    }),
    PrismaModule,
    SharedModule,
    AuditModule,
    AuthModule,
    AuthzModule,
    AgentsModule,
    ActionsModule,
    WorkforceModule,
    AssetsModule,
    OperationsModule,
    SchedulingModule,
    TriggersModule,
    IncidentsModule,
    IntegrationsModule,
    KnowledgeGraphModule,
    AssignmentsModule,
    ApprovalsModule,
    DashboardModule,
    DispatchModule,
    DriversModule,
    FleetModule,
    GovernanceModule,
    HealthModule,
    IntelligenceModule,
    CrmModule,
    NotificationsModule,
    ObservabilityModule,
    RetrievalModule,
    ReportsModule,
    TenancyModule,
    PeopleModule,
    OrganizationsModule,
    DepartmentsModule,
    PositionsModule,
    EmployeesModule,
    WorkflowsModule,
  ],
  providers: [
    RequestContextMiddleware,
    AuthRateLimitMiddleware,
    {
      provide: APP_GUARD,
      useClass: PlatformAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes({
      path: '*path',
      method: RequestMethod.ALL,
    });
    consumer.apply(AuthRateLimitMiddleware).forRoutes(
      { path: 'auth/login', method: RequestMethod.POST },
      { path: 'auth/refresh', method: RequestMethod.POST },
    );
  }
}
