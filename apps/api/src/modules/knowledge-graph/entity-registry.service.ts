import { Injectable, NotFoundException } from '@nestjs/common';

import {
  RegisteredEntity,
  RegisteredEntityCategory,
  RegisteredEntityType,
  buildRegisteredEntity,
} from '../../common/entities';
import { ApprovalsService } from '../approvals/approvals.service';
import { AssetsService } from '../assets/assets.service';
import { OperationsService } from '../operations/operations.service';
import { PeopleService } from '../people/people.service';
import { WorkflowsService } from '../workflows/workflows.service';

@Injectable()
export class EntityRegistryService {
  private readonly registry = new Map<string, RegisteredEntity>();

  constructor(
    private readonly peopleService: PeopleService,
    private readonly assetsService: AssetsService,
    private readonly operationsService: OperationsService,
    private readonly approvalsService: ApprovalsService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  registerEntityReference(entity: RegisteredEntity): RegisteredEntity {
    this.registry.set(this.buildRegistryKey(entity.entityType, entity.entityId), entity);
    return entity;
  }

  buildRegisteredEntity(input: {
    entityType: RegisteredEntityType;
    entityCategory: RegisteredEntityCategory;
    entityId: string;
    displayName: string;
    sourceModule: string;
    organizationId?: string | null;
    status?: string | null;
    metadata?: Record<string, unknown> | null;
  }): RegisteredEntity {
    return buildRegisteredEntity(input);
  }

  async getRegisteredEntity(params: {
    entityType: RegisteredEntityType;
    entityId: string;
    organizationId?: string;
  }): Promise<RegisteredEntity> {
    const cached = this.registry.get(this.buildRegistryKey(params.entityType, params.entityId));
    if (cached) {
      return cached;
    }

    switch (params.entityType) {
      case 'person': {
        const response = await this.peopleService.getPersonById(params.entityId);
        return this.registerEntityReference(
          this.buildRegisteredEntity({
            entityType: 'person',
            entityCategory: 'people',
            entityId: response.data.id,
            displayName: response.data.displayName,
            sourceModule: response.data.sourceModule,
            organizationId: response.data.organizationId,
            status: response.data.status,
          }),
        );
      }
      case 'asset': {
        const response = await this.assetsService.getAssetById(params.entityId);
        return this.registerEntityReference(
          this.buildRegisteredEntity({
            entityType: 'asset',
            entityCategory: 'assets',
            entityId: response.data.id,
            displayName: response.data.displayName,
            sourceModule: response.data.sourceModule,
            organizationId: response.data.organizationId,
            status: response.data.status,
          }),
        );
      }
      case 'operational-task': {
        const response = await this.operationsService.getOperationalTaskById(params.entityId);
        return this.registerEntityReference(
          this.buildRegisteredEntity({
            entityType: 'operational-task',
            entityCategory: 'operations',
            entityId: response.data.id,
            displayName: response.data.displayName,
            sourceModule: response.data.sourceModule,
            organizationId: response.data.organizationId,
            status: response.data.status,
            metadata: {
              relatedAssignmentId: response.data.relatedAssignmentId,
              zoneId: response.data.zoneId,
            },
          }),
        );
      }
      case 'workflow-instance': {
        const response = await this.workflowsService.getInstance(params.entityId);
        const instance = response.data as Record<string, unknown>;
        const definition =
          instance.definition && typeof instance.definition === 'object'
            ? (instance.definition as Record<string, unknown>)
            : null;
        return this.registerEntityReference(
          this.buildRegisteredEntity({
            entityType: 'workflow-instance',
            entityCategory: 'workflows',
            entityId: String(instance.id),
            displayName: String(definition?.name ?? `Workflow ${String(instance.id)}`),
            sourceModule: 'workflows',
            organizationId: String(instance.organizationId ?? params.organizationId ?? ''),
            status: String(instance.status ?? ''),
            metadata: {
              entityType: instance.entityType ?? null,
              entityId: instance.entityId ?? null,
            },
          }),
        );
      }
      case 'approval-request': {
        const response = await this.approvalsService.getRequest(params.entityId);
        const request = response.data as Record<string, unknown>;
        return this.registerEntityReference(
          this.buildRegisteredEntity({
            entityType: 'approval-request',
            entityCategory: 'approvals',
            entityId: String(request.id),
            displayName: String(request.title ?? `Approval ${String(request.id)}`),
            sourceModule: 'approvals',
            organizationId: String(request.organizationId ?? params.organizationId ?? ''),
            status: String(request.status ?? ''),
            metadata: {
              entityType: request.entityType ?? null,
              entityId: request.entityId ?? null,
            },
          }),
        );
      }
      default:
        throw new NotFoundException(`Unsupported entity type: ${params.entityType}`);
    }
  }

  async listRegisteredEntitiesByType(params: {
    entityType: RegisteredEntityType;
    organizationId: string;
    limit?: number;
  }): Promise<RegisteredEntity[]> {
    const limit = params.limit ?? 20;

    switch (params.entityType) {
      case 'person': {
        const response = await this.peopleService.listPeople({
          page: 1,
          limit,
          organizationId: params.organizationId,
        });
        return response.data.map((person) =>
          this.registerEntityReference(
            this.buildRegisteredEntity({
              entityType: 'person',
              entityCategory: 'people',
              entityId: person.id,
              displayName: person.displayName,
              sourceModule: person.sourceModule,
              organizationId: person.organizationId,
              status: person.status,
            }),
          ),
        );
      }
      case 'asset': {
        const response = await this.assetsService.listAssets({
          page: 1,
          limit,
          organizationId: params.organizationId,
        });
        return response.data.map((asset) =>
          this.registerEntityReference(
            this.buildRegisteredEntity({
              entityType: 'asset',
              entityCategory: 'assets',
              entityId: asset.id,
              displayName: asset.displayName,
              sourceModule: asset.sourceModule,
              organizationId: asset.organizationId,
              status: asset.status,
            }),
          ),
        );
      }
      case 'operational-task': {
        const response = await this.operationsService.listOperationalTasks({
          page: 1,
          limit,
          organizationId: params.organizationId,
        });
        return response.data.map((task) =>
          this.registerEntityReference(
            this.buildRegisteredEntity({
              entityType: 'operational-task',
              entityCategory: 'operations',
              entityId: task.id,
              displayName: task.displayName,
              sourceModule: task.sourceModule,
              organizationId: task.organizationId,
              status: task.status,
              metadata: {
                relatedAssignmentId: task.relatedAssignmentId,
                zoneId: task.zoneId,
              },
            }),
          ),
        );
      }
      case 'workflow-instance': {
        const instances = await this.workflowsService.findInstancesForOrganization(
          params.organizationId,
          limit,
        );
        return instances.map((instance) =>
          this.registerEntityReference(
            this.buildRegisteredEntity({
              entityType: 'workflow-instance',
              entityCategory: 'workflows',
              entityId: instance.id,
              displayName: instance.definition.name,
              sourceModule: 'workflows',
              organizationId: instance.organizationId,
              status: instance.status,
              metadata: {
                entityType: instance.entityType,
                entityId: instance.entityId,
              },
            }),
          ),
        );
      }
      case 'approval-request': {
        const requests = await this.approvalsService.findRequestsForOrganization(
          params.organizationId,
          limit,
        );
        return requests.map((request) =>
          this.registerEntityReference(
            this.buildRegisteredEntity({
              entityType: 'approval-request',
              entityCategory: 'approvals',
              entityId: request.id,
              displayName: request.title,
              sourceModule: 'approvals',
              organizationId: request.organizationId,
              status: request.status,
              metadata: {
                entityType: request.entityType,
                entityId: request.entityId,
              },
            }),
          ),
        );
      }
      default:
        return [];
    }
  }

  private buildRegistryKey(entityType: RegisteredEntityType, entityId: string) {
    return `${entityType}:${entityId}`;
  }
}
