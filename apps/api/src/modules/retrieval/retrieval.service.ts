import { Injectable } from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { AuditService } from '../audit/audit.service';
import { RetrievedContext } from '../../common/retrieval';
import { ContextRetrievalService } from './context-retrieval.service';
import { OperationalDataAggregatorService } from './operational-data-aggregator.service';
import { RetrievalOrchestratorService } from './retrieval-orchestrator.service';
import { RetrievalPoliciesService } from './retrieval-policies.service';
import { RetrievalBundle, RetrievalRequest } from './retrieval.types';
import { OperationalAggregate } from '../../common/aggregation';

@Injectable()
export class RetrievalService {
  constructor(
    private readonly retrievalOrchestratorService: RetrievalOrchestratorService,
    private readonly retrievalPoliciesService: RetrievalPoliciesService,
    private readonly contextRetrievalService: ContextRetrievalService,
    private readonly operationalDataAggregatorService: OperationalDataAggregatorService,
    private readonly auditService: AuditService,
  ) {}

  async retrieve(request: RetrievalRequest, principal?: CurrentPrincipal): Promise<RetrievalBundle> {
    const normalizedRequest = this.retrievalPoliciesService.normalizeRequest(request, principal);
    const bundle = await this.retrievalOrchestratorService.buildBundle(normalizedRequest);

    await this.auditService.record({
      action: 'retrieval.bundle.generate',
      entityType: normalizedRequest.targetEntityType,
      entityId: normalizedRequest.targetEntityId ?? null,
      organizationId: normalizedRequest.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Generated retrieval bundle for ${normalizedRequest.targetEntityType}.`,
      metadata: {
        agentId: normalizedRequest.agentId ?? null,
        agentRunId: normalizedRequest.agentRunId ?? null,
        retrievalTypes: normalizedRequest.retrievalTypes,
      },
    });

    return bundle;
  }

  retrieveForAgentRun(params: {
    organizationId: string;
    agentId?: string | null;
    agentRunId?: string | null;
    targetEntityType: string;
    targetEntityId?: string | null;
    retrievalTypes: RetrievalRequest['retrievalTypes'];
    metadata?: Record<string, unknown> | null;
  }) {
    return this.retrieve({
      organizationId: params.organizationId,
      agentId: params.agentId,
      agentRunId: params.agentRunId,
      targetEntityType: params.targetEntityType,
      targetEntityId: params.targetEntityId,
      retrievalTypes: params.retrievalTypes,
      includeRelated: true,
      metadata: params.metadata ?? null,
    });
  }

  getEntityContext(params: {
    entityType: 'person' | 'asset' | 'operational-task' | 'approval-request' | 'workflow-instance';
    entityId: string;
    organizationId?: string;
  }): Promise<RetrievedContext> {
    // TODO: Merge structured context retrieval into retrieval bundle assembly once
    // bundle-level signal-aware context composition is introduced.
    return this.contextRetrievalService.getEntityContext(params);
  }

  getModuleContext(params: {
    moduleKey: 'people' | 'assets' | 'operations' | 'approvals' | 'workflows';
    organizationId: string;
    limit?: number;
  }): Promise<RetrievedContext> {
    return this.contextRetrievalService.getModuleContext(params);
  }

  getRelatedOperationalContext(params: {
    entityType: 'person' | 'asset' | 'operational-task' | 'approval-request' | 'workflow-instance';
    entityId: string;
    limit?: number;
  }): Promise<RetrievedContext[]> {
    return this.contextRetrievalService.getRelatedOperationalContext(params);
  }

  aggregateForEntity(params: {
    entityType: 'person' | 'asset' | 'operational-task' | 'workflow-instance';
    entityId: string;
    organizationId?: string;
  }): Promise<OperationalAggregate> {
    return this.operationalDataAggregatorService.aggregateForEntity(params);
  }

  aggregateForOperationalTask(params: {
    taskId: string;
    organizationId?: string;
  }): Promise<OperationalAggregate> {
    return this.operationalDataAggregatorService.aggregateForOperationalTask(params);
  }

  aggregateForWorkflow(params: {
    workflowInstanceId: string;
    organizationId?: string;
  }): Promise<OperationalAggregate> {
    return this.operationalDataAggregatorService.aggregateForWorkflow(params);
  }
}
