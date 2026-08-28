import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';
import { AuditModule } from '../audit/audit.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { AssetsModule } from '../assets/assets.module';
import { OperationsModule } from '../operations/operations.module';
import { PeopleModule } from '../people/people.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { EntityRegistryService } from './entity-registry.service';
import { GraphAnalyticsService } from './graph-analytics.service';
import { GraphBuilderService } from './graph-builder.service';
import { GraphQueryService } from './graph-query.service';
import { GraphRepository } from './graph.repository';
import { GraphUpdaterService } from './graph-updater.service';

@Module({
  imports: [
    PrismaModule,
    SharedModule,
    AuditModule,
    PeopleModule,
    AssetsModule,
    OperationsModule,
    ApprovalsModule,
    WorkflowsModule,
  ],
  providers: [
    GraphRepository,
    GraphBuilderService,
    GraphAnalyticsService,
    GraphQueryService,
    GraphUpdaterService,
    EntityRegistryService,
  ],
  exports: [GraphQueryService, GraphUpdaterService, EntityRegistryService],
})
export class KnowledgeGraphModule {}
