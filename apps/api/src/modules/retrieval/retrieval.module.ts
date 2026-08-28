import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';
import { AuditModule } from '../audit/audit.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { AssetsModule } from '../assets/assets.module';
import { KnowledgeGraphModule } from '../knowledge-graph/knowledge-graph.module';
import { OperationsModule } from '../operations/operations.module';
import { PeopleModule } from '../people/people.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { ContextRetrievalService } from './context-retrieval.service';
import { OperationalDataAggregatorService } from './operational-data-aggregator.service';
import { AssignmentRetrievalProvider } from './providers/assignment-retrieval.provider';
import { AssetRetrievalProvider } from './providers/asset-retrieval.provider';
import { IncidentRetrievalProvider } from './providers/incident-retrieval.provider';
import { KnowledgeGraphRetrievalProvider } from './providers/knowledge-graph-retrieval.provider';
import { OperationsRetrievalProvider } from './providers/operations-retrieval.provider';
import { SchedulingRetrievalProvider } from './providers/scheduling-retrieval.provider';
import { WorkforceRetrievalProvider } from './providers/workforce-retrieval.provider';
import { RetrievalOrchestratorService } from './retrieval-orchestrator.service';
import { RetrievalPoliciesService } from './retrieval-policies.service';
import { RetrievalRegistryService } from './retrieval-registry.service';
import { RetrievalRepository } from './retrieval.repository';
import { RetrievalService } from './retrieval.service';

@Module({
  imports: [
    PrismaModule,
    SharedModule,
    AuditModule,
    KnowledgeGraphModule,
    PeopleModule,
    AssetsModule,
    OperationsModule,
    ApprovalsModule,
    WorkflowsModule,
  ],
  providers: [
    RetrievalRepository,
    RetrievalPoliciesService,
    RetrievalRegistryService,
    RetrievalOrchestratorService,
    RetrievalService,
    ContextRetrievalService,
    OperationalDataAggregatorService,
    WorkforceRetrievalProvider,
    AssetRetrievalProvider,
    OperationsRetrievalProvider,
    SchedulingRetrievalProvider,
    IncidentRetrievalProvider,
    AssignmentRetrievalProvider,
    KnowledgeGraphRetrievalProvider,
  ],
  exports: [RetrievalService, ContextRetrievalService, OperationalDataAggregatorService],
})
export class RetrievalModule {}
