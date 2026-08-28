import { Injectable, NotFoundException } from '@nestjs/common';

import {
  RetrievedContext,
  RetrievedContextCategory,
  buildRetrievedContext,
} from '../../common/retrieval';
import { AssetsService } from '../assets/assets.service';
import { OperationsService } from '../operations/operations.service';
import { PeopleService } from '../people/people.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { WorkflowsService } from '../workflows/workflows.service';

type SupportedEntityType =
  | 'person'
  | 'asset'
  | 'operational-task'
  | 'approval-request'
  | 'workflow-instance';

type SupportedModuleKey = 'people' | 'assets' | 'operations' | 'approvals' | 'workflows';

@Injectable()
export class ContextRetrievalService {
  constructor(
    private readonly peopleService: PeopleService,
    private readonly assetsService: AssetsService,
    private readonly operationsService: OperationsService,
    private readonly approvalsService: ApprovalsService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  async getEntityContext(params: {
    entityType: SupportedEntityType;
    entityId: string;
    organizationId?: string;
  }): Promise<RetrievedContext> {
    switch (params.entityType) {
      case 'person': {
        const response = await this.peopleService.getPersonById(params.entityId);
        return this.buildRetrievedContext({
          contextType: 'entity-summary',
          contextCategory: 'people',
          title: response.data.displayName,
          summary: `Person context from ${response.data.sourceModule}.`,
          sourceModule: 'people',
          sourceEntityType: 'person',
          sourceEntityId: response.data.id,
          organizationId: response.data.organizationId,
          payload: response.data as unknown as Record<string, unknown>,
          metadata: {
            normalizedFrom: response.data.sourceModule,
          },
        });
      }
      case 'asset': {
        const response = await this.assetsService.getAssetById(params.entityId);
        return this.buildRetrievedContext({
          contextType: 'entity-summary',
          contextCategory: 'assets',
          title: response.data.displayName,
          summary: `Asset context from ${response.data.sourceModule}.`,
          sourceModule: 'assets',
          sourceEntityType: 'asset',
          sourceEntityId: response.data.id,
          organizationId: response.data.organizationId,
          payload: response.data as unknown as Record<string, unknown>,
          metadata: {
            normalizedFrom: response.data.sourceModule,
          },
        });
      }
      case 'operational-task': {
        const response = await this.operationsService.getOperationalTaskById(params.entityId);
        return this.buildRetrievedContext({
          contextType: 'entity-summary',
          contextCategory: 'operations',
          title: response.data.displayName,
          summary: `Operational task context from ${response.data.sourceModule}.`,
          sourceModule: 'operations',
          sourceEntityType: 'operational-task',
          sourceEntityId: response.data.id,
          organizationId: response.data.organizationId,
          payload: response.data as unknown as Record<string, unknown>,
          metadata: {
            normalizedFrom: response.data.sourceModule,
          },
        });
      }
      case 'approval-request': {
        const response = await this.approvalsService.getRequest(params.entityId);
        const request = response.data as Record<string, unknown>;
        return this.buildRetrievedContext({
          contextType: 'entity-summary',
          contextCategory: 'approvals',
          title: String(request.title ?? 'Approval request'),
          summary: `Approval request context for ${String(request.entityType ?? 'entity')}.`,
          sourceModule: 'approvals',
          sourceEntityType: 'approval-request',
          sourceEntityId: String(request.id),
          organizationId: String(request.organizationId ?? params.organizationId ?? ''),
          payload: request,
        });
      }
      case 'workflow-instance': {
        const response = await this.workflowsService.getInstance(params.entityId);
        const instance = response.data as Record<string, unknown>;
        return this.buildRetrievedContext({
          contextType: 'entity-summary',
          contextCategory: 'workflows',
          title: `Workflow instance ${String(instance.id)}`,
          summary: `Workflow context for ${String(instance.entityType ?? 'entity')}.`,
          sourceModule: 'workflows',
          sourceEntityType: 'workflow-instance',
          sourceEntityId: String(instance.id),
          organizationId: String(instance.organizationId ?? params.organizationId ?? ''),
          payload: instance,
        });
      }
      default:
        throw new NotFoundException(`Unsupported entity context type: ${params.entityType}`);
    }
  }

  async getModuleContext(params: {
    moduleKey: SupportedModuleKey;
    organizationId: string;
    limit?: number;
  }): Promise<RetrievedContext> {
    const limit = params.limit ?? 10;

    switch (params.moduleKey) {
      case 'people': {
        const response = await this.peopleService.listPeople({
          page: 1,
          limit,
          organizationId: params.organizationId,
        });
        return this.buildRetrievedContext({
          contextType: 'module-summary',
          contextCategory: 'people',
          title: 'People context',
          summary: `Retrieved ${response.data.length} normalized people records.`,
          sourceModule: 'people',
          organizationId: params.organizationId,
          payload: {
            items: response.data as unknown as Record<string, unknown>[],
            pagination: response.meta,
          },
          metadata: {
            // TODO: Add cross-module relevance ranking once richer retrieval orchestration exists.
            limit,
          },
        });
      }
      case 'assets': {
        const response = await this.assetsService.listAssets({
          page: 1,
          limit,
          organizationId: params.organizationId,
        });
        return this.buildRetrievedContext({
          contextType: 'module-summary',
          contextCategory: 'assets',
          title: 'Assets context',
          summary: `Retrieved ${response.data.length} normalized asset records.`,
          sourceModule: 'assets',
          organizationId: params.organizationId,
          payload: {
            items: response.data as unknown as Record<string, unknown>[],
            pagination: response.meta,
          },
          metadata: {
            limit,
          },
        });
      }
      case 'operations': {
        const response = await this.operationsService.listOperationalTasks({
          page: 1,
          limit,
          organizationId: params.organizationId,
        });
        return this.buildRetrievedContext({
          contextType: 'module-summary',
          contextCategory: 'operations',
          title: 'Operational tasks context',
          summary: `Retrieved ${response.data.length} normalized operational task records.`,
          sourceModule: 'operations',
          organizationId: params.organizationId,
          payload: {
            items: response.data as unknown as Record<string, unknown>[],
            pagination: response.meta,
          },
          metadata: {
            limit,
          },
        });
      }
      case 'approvals': {
        const pendingSteps = await this.approvalsService.countPendingStepsForOrganization(params.organizationId);
        return this.buildRetrievedContext({
          contextType: 'module-summary',
          contextCategory: 'approvals',
          title: 'Approvals context',
          summary: `Found ${pendingSteps} pending approval steps.`,
          sourceModule: 'approvals',
          organizationId: params.organizationId,
          payload: {
            pendingApprovalStepCount: pendingSteps,
          },
          metadata: {
            // TODO: Add approval-age windows and approver-role segmentation in a future retrieval pass.
          },
        });
      }
      case 'workflows': {
        const overdueTasks = await this.workflowsService.findOverdueOpenTasksForOrganization(
          params.organizationId,
          limit,
        );
        return this.buildRetrievedContext({
          contextType: 'module-summary',
          contextCategory: 'workflows',
          title: 'Workflows context',
          summary: `Found ${overdueTasks.length} overdue open workflow tasks.`,
          sourceModule: 'workflows',
          organizationId: params.organizationId,
          payload: {
            overdueOpenTasks: overdueTasks as unknown as Record<string, unknown>[],
          },
          metadata: {
            limit,
          },
        });
      }
      default:
        throw new NotFoundException(`Unsupported module context key: ${params.moduleKey}`);
    }
  }

  async getRelatedOperationalContext(params: {
    entityType: SupportedEntityType;
    entityId: string;
    limit?: number;
  }): Promise<RetrievedContext[]> {
    const entityContext = await this.getEntityContext({
      entityType: params.entityType,
      entityId: params.entityId,
    });

    const organizationId = entityContext.organizationId;
    if (!organizationId) {
      return [];
    }

    const relatedModuleKeys = this.getRelatedModuleKeys(params.entityType);
    const relatedContexts = await Promise.all(
      relatedModuleKeys.map((moduleKey) =>
        this.getModuleContext({
          moduleKey,
          organizationId,
          limit: params.limit ?? 10,
        }),
      ),
    );

    return relatedContexts.map((context) =>
      this.buildRetrievedContext({
        ...context,
        contextType: 'related-context',
        relatedContextIds: [entityContext.contextId],
        metadata: {
          ...(context.metadata ?? {}),
          // TODO: Replace organization-wide related context assembly with entity-linked joins
          // once cross-module retrieval relationships are standardized.
          relatedToEntityType: params.entityType,
          relatedToEntityId: params.entityId,
        },
      }),
    );
  }

  buildRetrievedContext(input: {
    contextType: string;
    contextCategory: RetrievedContextCategory;
    title: string;
    summary: string;
    sourceModule: string;
    sourceEntityType?: string | null;
    sourceEntityId?: string | null;
    organizationId?: string | null;
    payload: Record<string, unknown> | null;
    relatedContextIds?: string[];
    metadata?: Record<string, unknown> | null;
  }): RetrievedContext {
    return buildRetrievedContext({
      ...input,
      relatedContextIds: input.relatedContextIds ?? [],
    });
  }

  private getRelatedModuleKeys(entityType: SupportedEntityType): SupportedModuleKey[] {
    switch (entityType) {
      case 'person':
        return ['operations', 'workflows', 'approvals'];
      case 'asset':
        return ['operations', 'workflows'];
      case 'operational-task':
        return ['people', 'assets', 'approvals', 'workflows'];
      case 'approval-request':
        return ['workflows', 'operations'];
      case 'workflow-instance':
        return ['approvals', 'operations'];
      default:
        return [];
    }
  }
}
