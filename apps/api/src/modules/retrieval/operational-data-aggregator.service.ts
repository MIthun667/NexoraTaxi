import { Injectable } from '@nestjs/common';

import {
  OperationalAggregate,
  OperationalAggregateCategory,
  buildOperationalAggregate,
} from '../../common/aggregation';
import { RetrievedContext } from '../../common/retrieval';
import { CanonicalSignal } from '../../common/signals';
import { ContextRetrievalService } from './context-retrieval.service';

type AggregateEntityType =
  | 'person'
  | 'asset'
  | 'operational-task'
  | 'workflow-instance';

@Injectable()
export class OperationalDataAggregatorService {
  constructor(
    private readonly contextRetrievalService: ContextRetrievalService,
  ) {}

  async aggregateForEntity(params: {
    entityType: AggregateEntityType;
    entityId: string;
    organizationId?: string;
  }): Promise<OperationalAggregate> {
    const primaryContext = await this.contextRetrievalService.getEntityContext({
      entityType: params.entityType,
      entityId: params.entityId,
      organizationId: params.organizationId,
    });

    const relatedContexts =
      await this.contextRetrievalService.getRelatedOperationalContext({
        entityType: params.entityType,
        entityId: params.entityId,
      });

    return this.buildOperationalAggregate({
      aggregateType: 'entity-operational-view',
      aggregateCategory: this.mapEntityTypeToCategory(params.entityType),
      title: `${primaryContext.title} operational aggregate`,
      summary: `Cross-module operational context for ${primaryContext.title}.`,
      organizationId: primaryContext.organizationId,
      primaryEntityType: params.entityType,
      primaryEntityId: params.entityId,
      people: this.collectContexts('people', primaryContext, relatedContexts),
      assets: this.collectContexts('assets', primaryContext, relatedContexts),
      operationalTasks: this.collectContexts('operations', primaryContext, relatedContexts),
      workflows: this.collectContexts('workflows', primaryContext, relatedContexts),
      approvals: this.collectContexts('approvals', primaryContext, relatedContexts),
      signals: [],
      metadata: {
        // TODO: Add signal-aware aggregation once canonical signal collection is orchestrated centrally.
        relatedContextCount: relatedContexts.length,
      },
    });
  }

  aggregateForOperationalTask(params: {
    taskId: string;
    organizationId?: string;
  }): Promise<OperationalAggregate> {
    return this.aggregateForEntity({
      entityType: 'operational-task',
      entityId: params.taskId,
      organizationId: params.organizationId,
    });
  }

  async aggregateForWorkflow(params: {
    workflowInstanceId: string;
    organizationId?: string;
  }): Promise<OperationalAggregate> {
    const workflowContext = await this.contextRetrievalService.getEntityContext({
      entityType: 'workflow-instance',
      entityId: params.workflowInstanceId,
      organizationId: params.organizationId,
    });

    const workflowPayload = workflowContext.payload ?? {};
    const relatedEntityType =
      typeof workflowPayload.entityType === 'string'
        ? workflowPayload.entityType
        : null;
    const relatedEntityId =
      typeof workflowPayload.entityId === 'string' ? workflowPayload.entityId : null;

    const relatedContexts: RetrievedContext[] = [];

    if (workflowContext.organizationId) {
      relatedContexts.push(
        await this.contextRetrievalService.getModuleContext({
          moduleKey: 'approvals',
          organizationId: workflowContext.organizationId,
        }),
      );
    }

    if (relatedEntityType === 'operational-task' && relatedEntityId) {
      relatedContexts.push(
        await this.contextRetrievalService.getEntityContext({
          entityType: 'operational-task',
          entityId: relatedEntityId,
          organizationId: workflowContext.organizationId ?? undefined,
        }),
      );
    }

    return this.buildOperationalAggregate({
      aggregateType: 'workflow-operational-view',
      aggregateCategory: 'workflows',
      title: `${workflowContext.title} aggregate`,
      summary: `Workflow-centered operational context for ${workflowContext.title}.`,
      organizationId: workflowContext.organizationId,
      primaryEntityType: 'workflow-instance',
      primaryEntityId: params.workflowInstanceId,
      people: this.collectContexts('people', workflowContext, relatedContexts),
      assets: this.collectContexts('assets', workflowContext, relatedContexts),
      operationalTasks: this.collectContexts('operations', workflowContext, relatedContexts),
      workflows: this.collectContexts('workflows', workflowContext, relatedContexts),
      approvals: this.collectContexts('approvals', workflowContext, relatedContexts),
      signals: [],
      metadata: {
        // TODO: Add richer workflow relationship traversal and workflow-to-entity linkage resolution.
        relatedEntityType,
        relatedEntityId,
      },
    });
  }

  buildOperationalAggregate(input: {
    aggregateType: string;
    aggregateCategory: OperationalAggregateCategory;
    title: string;
    summary: string;
    organizationId?: string | null;
    primaryEntityType?: string | null;
    primaryEntityId?: string | null;
    people?: RetrievedContext[];
    assets?: RetrievedContext[];
    operationalTasks?: RetrievedContext[];
    workflows?: RetrievedContext[];
    approvals?: RetrievedContext[];
    signals?: CanonicalSignal[];
    metadata?: Record<string, unknown> | null;
  }): OperationalAggregate {
    return buildOperationalAggregate({
      ...input,
      people: input.people ?? [],
      assets: input.assets ?? [],
      operationalTasks: input.operationalTasks ?? [],
      workflows: input.workflows ?? [],
      approvals: input.approvals ?? [],
      signals: input.signals ?? [],
    });
  }

  private collectContexts(
    category: RetrievedContext['contextCategory'],
    primaryContext: RetrievedContext,
    relatedContexts: RetrievedContext[],
  ): RetrievedContext[] {
    const contexts = [
      ...(primaryContext.contextCategory === category ? [primaryContext] : []),
      ...relatedContexts.filter((context) => context.contextCategory === category),
    ];

    // TODO: Introduce time-window filtering and relevance-aware deduplication once
    // cross-module retrieval becomes signal- and recommendation-aware.
    return contexts;
  }

  private mapEntityTypeToCategory(
    entityType: AggregateEntityType,
  ): OperationalAggregateCategory {
    switch (entityType) {
      case 'person':
        return 'people';
      case 'asset':
        return 'assets';
      case 'operational-task':
        return 'operations';
      case 'workflow-instance':
        return 'workflows';
      default:
        return 'system';
    }
  }
}
