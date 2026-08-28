import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationCategory,
  NotificationSeverity,
  Prisma,
  TaskActionType,
  UserStatus,
  WorkflowInstanceStatus,
  WorkflowTaskStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ActOnTaskDto } from './dto/act-on-task.dto';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { CreateWorkflowInstanceDto } from './dto/create-workflow-instance.dto';
import { CreateWorkflowTaskDto } from './dto/create-workflow-task.dto';
import { QueryWorkflowTasksDto } from './dto/query-workflow-tasks.dto';

const workflowDefinitionSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  moduleKey: true,
  version: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WorkflowDefinitionSelect;

const workflowTaskSelect = {
  id: true,
  taskKey: true,
  title: true,
  description: true,
  status: true,
  assigneeUserId: true,
  assigneeRoleCode: true,
  dueAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WorkflowTaskSelect;

const workflowTaskDetailSelect = {
  ...workflowTaskSelect,
  instance: {
    select: {
      id: true,
      organizationId: true,
      entityType: true,
      entityId: true,
      status: true,
      definition: {
        select: {
          id: true,
          code: true,
          name: true,
          moduleKey: true,
          version: true,
        },
      },
    },
  },
  actions: {
    select: {
      id: true,
      actionType: true,
      actionLabel: true,
      actorUserId: true,
      comment: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
} satisfies Prisma.WorkflowTaskSelect;

const workflowInstanceSelect = {
  id: true,
  status: true,
  entityType: true,
  entityId: true,
  organizationId: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  definition: {
    select: workflowDefinitionSelect,
  },
  tasks: {
    select: workflowTaskSelect,
    orderBy: [{ createdAt: 'asc' }],
  },
} satisfies Prisma.WorkflowInstanceSelect;

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async createDefinition(dto: CreateWorkflowDefinitionDto) {
    const existingDefinition = await this.prismaService.workflowDefinition.findUnique({
      where: {
        code: dto.code,
      },
      select: {
        id: true,
      },
    });

    if (existingDefinition) {
      throw new ConflictException('A workflow definition with the provided code already exists.');
    }

    const definition = await this.prismaService.workflowDefinition.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        moduleKey: dto.moduleKey,
        version: dto.version ?? 1,
        isActive: dto.isActive ?? true,
      },
      select: workflowDefinitionSelect,
    });

    return buildSuccessResponse('Workflow definition created successfully.', definition);
  }

  async listDefinitions(query: PaginationQueryDto) {
    const { page, limit, skip } = resolvePagination(query);

    const [definitions, total] = await this.prismaService.$transaction([
      this.prismaService.workflowDefinition.findMany({
        select: workflowDefinitionSelect,
        orderBy: [{ moduleKey: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.workflowDefinition.count(),
    ]);

    return buildPaginatedResponse(
      'Workflow definitions retrieved successfully.',
      definitions,
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getDefinition(id: string) {
    const definition = await this.prismaService.workflowDefinition.findUnique({
      where: { id },
      select: {
        ...workflowDefinitionSelect,
        escalationRules: {
          select: {
            id: true,
            taskKey: true,
            escalationType: true,
            thresholdMinutes: true,
            targetRoleCode: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ taskKey: 'asc' }],
        },
      },
    });

    if (!definition) {
      throw new NotFoundException('Workflow definition not found.');
    }

    return buildSuccessResponse('Workflow definition retrieved successfully.', definition);
  }

  async createInstance(dto: CreateWorkflowInstanceDto) {
    const definition = await this.prismaService.workflowDefinition.findUnique({
      where: { id: dto.definitionId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!definition) {
      throw new NotFoundException('Workflow definition not found.');
    }

    if (!definition.isActive) {
      throw new BadRequestException('Inactive workflow definitions cannot create new instances.');
    }

    await this.ensureOrganizationExists(dto.organizationId);
    await this.ensureActiveUserInOrganization(dto.createdByUserId, dto.organizationId);
    await this.validateTaskAssignments(dto.organizationId, dto.initialTasks ?? []);

    const instanceId = randomUUID();
    const taskRows = (dto.initialTasks ?? []).map((task) =>
      this.buildWorkflowTaskCreateManyInput(instanceId, task),
    );

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.workflowInstance.create({
        data: {
          id: instanceId,
          definitionId: dto.definitionId,
          organizationId: dto.organizationId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          status: WorkflowInstanceStatus.ACTIVE,
          createdByUserId: dto.createdByUserId,
        },
      });

      if (taskRows.length > 0) {
        await transaction.workflowTask.createMany({
          data: taskRows,
        });
      }
    });

    const instance = await this.prismaService.workflowInstance.findUnique({
      where: { id: instanceId },
      select: workflowInstanceSelect,
    });

    for (const task of instance?.tasks ?? []) {
      if (!task.assigneeUserId && !task.assigneeRoleCode) {
        continue;
      }

      await this.domainEventsService.publish({
        organizationId: dto.organizationId,
        eventType: 'workflow.task.assigned',
        aggregateType: 'workflow-task',
        aggregateId: task.id,
        triggeredByUserId: dto.createdByUserId,
        payload: {
          notification: {
            category: NotificationCategory.WORKFLOW,
            severity: NotificationSeverity.INFO,
            title: 'Workflow task assigned',
            message: `A workflow task has been assigned: ${task.title}.`,
            actionUrl: `/workflows/${instanceId}`,
            entityType: 'workflow-task',
            entityId: task.id,
            metadata: {
              workflowInstanceId: instanceId,
              taskKey: task.taskKey,
            },
          },
          recipients: {
            userIds: task.assigneeUserId ? [task.assigneeUserId] : [],
            roleCodes: task.assigneeRoleCode ? [task.assigneeRoleCode] : [],
          },
        },
      });
    }

    return buildSuccessResponse('Workflow instance created successfully.', instance);
  }

  async getInstance(id: string) {
    const instance = await this.prismaService.workflowInstance.findUnique({
      where: { id },
      select: workflowInstanceSelect,
    });

    if (!instance) {
      throw new NotFoundException('Workflow instance not found.');
    }

    return buildSuccessResponse('Workflow instance retrieved successfully.', instance);
  }

  async getMyTasks(principal: CurrentPrincipal, query: QueryWorkflowTasksDto) {
    const { page, limit, skip } = resolvePagination(query);

    const where: Prisma.WorkflowTaskWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      OR: [
        { assigneeUserId: principal.userId },
        ...(principal.roles.length > 0
          ? [{ assigneeRoleCode: { in: principal.roles } }]
          : []),
      ],
    };

    const [tasks, total] = await this.prismaService.$transaction([
      this.prismaService.workflowTask.findMany({
        where,
        select: {
          ...workflowTaskSelect,
          instance: {
            select: {
              id: true,
              entityType: true,
              entityId: true,
              status: true,
              definition: {
                select: {
                  code: true,
                  name: true,
                  moduleKey: true,
                },
              },
            },
          },
        },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.workflowTask.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Assigned workflow tasks retrieved successfully.',
      tasks,
      buildPaginationMeta({ page, limit, total }),
    );
  }

  findInstancesForOrganization(organizationId: string, limit = 20) {
    return this.prismaService.workflowInstance.findMany({
      where: { organizationId },
      select: workflowInstanceSelect,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  findOverdueOpenTasksForOrganization(organizationId: string, limit = 10) {
    return this.prismaService.workflowTask.findMany({
      where: {
        instance: { organizationId },
        status: {
          in: [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS],
        },
        dueAt: { lt: new Date() },
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        updatedAt: true,
        instance: {
          select: {
            id: true,
            entityType: true,
            entityId: true,
          },
        },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  async getTask(id: string) {
    const task = await this.prismaService.workflowTask.findUnique({
      where: { id },
      select: workflowTaskDetailSelect,
    });

    if (!task) {
      throw new NotFoundException('Workflow task not found.');
    }

    return buildSuccessResponse('Workflow task retrieved successfully.', task);
  }

  async actOnTask(id: string, principal: CurrentPrincipal, dto: ActOnTaskDto) {
    const task = await this.prismaService.workflowTask.findUnique({
      where: { id },
      select: {
        id: true,
        instanceId: true,
        status: true,
        assigneeUserId: true,
        assigneeRoleCode: true,
        instance: {
          select: {
            organizationId: true,
            status: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Workflow task not found.');
    }

    if (task.instance.status !== WorkflowInstanceStatus.ACTIVE) {
      throw new BadRequestException('Actions can only be applied to active workflow instances.');
    }

    await this.ensureActiveUserInOrganization(principal.userId, task.instance.organizationId);

    if (dto.assigneeUserId) {
      await this.ensureActiveUserInOrganization(dto.assigneeUserId, task.instance.organizationId);
    }

    const nextTaskState = this.resolveTaskStateTransition(dto);

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.taskAction.create({
        data: {
          taskId: id,
          actionType: dto.actionType,
          actionLabel: dto.actionType,
          actorUserId: principal.userId,
          comment: dto.comment,
          metadata:
            dto.metadata !== undefined
              ? (dto.metadata as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      });

      await transaction.workflowTask.update({
        where: { id },
        data: {
          ...(nextTaskState.status ? { status: nextTaskState.status } : {}),
          ...(nextTaskState.completedAt !== undefined
            ? { completedAt: nextTaskState.completedAt }
            : {}),
          ...(nextTaskState.assigneeUserId !== undefined
            ? { assigneeUserId: nextTaskState.assigneeUserId }
            : {}),
          ...(nextTaskState.assigneeRoleCode !== undefined
            ? { assigneeRoleCode: nextTaskState.assigneeRoleCode }
            : {}),
        },
      });

      if (
        nextTaskState.status === WorkflowTaskStatus.COMPLETED ||
        dto.actionType === TaskActionType.APPROVE ||
        dto.actionType === TaskActionType.COMPLETE
      ) {
        const remainingOpenTasks = await transaction.workflowTask.count({
          where: {
            instanceId: task.instanceId,
            status: {
              in: [
                WorkflowTaskStatus.PENDING,
                WorkflowTaskStatus.IN_PROGRESS,
                WorkflowTaskStatus.ESCALATED,
              ],
            },
          },
        });

        if (remainingOpenTasks === 0) {
          await transaction.workflowInstance.update({
            where: { id: task.instanceId },
            data: {
              status: WorkflowInstanceStatus.COMPLETED,
              completedAt: new Date(),
            },
          });
        }
      }
    });

    const updatedTask = await this.prismaService.workflowTask.findUnique({
      where: { id },
      select: workflowTaskDetailSelect,
    });

    await this.auditService.record({
      action: 'workflow.task.action',
      entityType: 'workflow-task',
      entityId: id,
      organizationId: task.instance.organizationId,
      actorUserId: principal.userId,
      summary: `Workflow task ${id} processed with action ${dto.actionType.toLowerCase()}.`,
      metadata: {
        actionType: dto.actionType,
        comment: dto.comment ?? null,
        assigneeUserId: dto.assigneeUserId ?? null,
        assigneeRoleCode: dto.assigneeRoleCode ?? null,
      },
    });

    await this.domainEventsService.publish({
      organizationId: task.instance.organizationId,
      eventType: 'workflow.task.action.recorded',
      aggregateType: 'workflow-task',
      aggregateId: id,
      triggeredByUserId: principal.userId,
      payload: {
        notification: {
          category: NotificationCategory.WORKFLOW,
          severity: NotificationSeverity.INFO,
          title: 'Workflow task updated',
          message: `Workflow action recorded: ${dto.actionType.toLowerCase().replaceAll('_', ' ')}.`,
          actionUrl: `/workflows/${task.instanceId}`,
          entityType: 'workflow-task',
          entityId: id,
          metadata: {
            actionType: dto.actionType,
            comment: dto.comment ?? null,
          },
        },
        recipients: {
          userIds: updatedTask?.assigneeUserId ? [updatedTask.assigneeUserId] : [],
          roleCodes: updatedTask?.assigneeRoleCode ? [updatedTask.assigneeRoleCode] : [],
        },
      },
    });

    if (dto.actionType === TaskActionType.ASSIGN && updatedTask) {
      await this.domainEventsService.publish({
        organizationId: task.instance.organizationId,
        eventType: 'workflow.task.assigned',
        aggregateType: 'workflow-task',
        aggregateId: id,
        triggeredByUserId: principal.userId,
        payload: {
          notification: {
            category: NotificationCategory.WORKFLOW,
            severity: NotificationSeverity.INFO,
            title: 'Workflow task assigned',
            message: `A workflow task has been assigned: ${updatedTask.title}.`,
            actionUrl: `/workflows/${task.instanceId}`,
            entityType: 'workflow-task',
            entityId: id,
            metadata: {
              actionType: dto.actionType,
            },
          },
          recipients: {
            userIds: updatedTask.assigneeUserId ? [updatedTask.assigneeUserId] : [],
            roleCodes: updatedTask.assigneeRoleCode ? [updatedTask.assigneeRoleCode] : [],
          },
        },
      });
    }

    return buildSuccessResponse(
      'Workflow task action processed successfully.',
      updatedTask,
    );
  }

  private resolveTaskStateTransition(dto: ActOnTaskDto): {
    status?: WorkflowTaskStatus;
    completedAt?: Date | null;
    assigneeUserId?: string | null;
    assigneeRoleCode?: string | null;
  } {
    switch (dto.actionType) {
      case TaskActionType.APPROVE:
      case TaskActionType.COMPLETE:
        return {
          status: WorkflowTaskStatus.COMPLETED,
          completedAt: new Date(),
        };
      case TaskActionType.REJECT:
        return {
          status: WorkflowTaskStatus.REJECTED,
          completedAt: new Date(),
        };
      case TaskActionType.SEND_BACK:
        return {
          status: WorkflowTaskStatus.PENDING,
          completedAt: null,
        };
      case TaskActionType.COMMENT:
        return {};
      case TaskActionType.ASSIGN:
        if (!dto.assigneeUserId && !dto.assigneeRoleCode) {
          throw new BadRequestException(
            'Assign actions require assigneeUserId or assigneeRoleCode.',
          );
        }

        return {
          status: WorkflowTaskStatus.IN_PROGRESS,
          completedAt: null,
          assigneeUserId: dto.assigneeUserId ?? null,
          assigneeRoleCode: dto.assigneeRoleCode ?? null,
        };
      case TaskActionType.ESCALATE:
        return {
          status: WorkflowTaskStatus.ESCALATED,
          completedAt: null,
          assigneeUserId: dto.assigneeUserId ?? null,
          assigneeRoleCode: dto.assigneeRoleCode ?? null,
        };
      default:
        throw new BadRequestException('Unsupported workflow task action.');
    }
  }

  private buildWorkflowTaskCreateManyInput(instanceId: string, task: CreateWorkflowTaskDto) {
    if (!task.assigneeUserId && !task.assigneeRoleCode) {
      throw new BadRequestException(
        'Workflow tasks require either assigneeUserId or assigneeRoleCode.',
      );
    }

    return {
      id: randomUUID(),
      instanceId,
      taskKey: task.taskKey,
      title: task.title,
      description: task.description,
      status: WorkflowTaskStatus.PENDING,
      assigneeUserId: task.assigneeUserId ?? null,
      assigneeRoleCode: task.assigneeRoleCode ?? null,
      dueAt: task.dueAt ? new Date(task.dueAt) : null,
      completedAt: null,
    } satisfies Prisma.WorkflowTaskCreateManyInput;
  }

  private async ensureOrganizationExists(organizationId: string) {
    const organization = await this.prismaService.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }
  }

  private async ensureActiveUserInOrganization(userId: string, organizationId: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        id: userId,
        organizationId,
        deletedAt: null,
        status: {
          in: [UserStatus.ACTIVE, UserStatus.INVITED],
        },
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }
  }

  private async validateTaskAssignments(
    organizationId: string,
    tasks: CreateWorkflowTaskDto[],
  ) {
    for (const task of tasks) {
      if (!task.assigneeUserId && !task.assigneeRoleCode) {
        throw new BadRequestException(
          'Workflow tasks require either assigneeUserId or assigneeRoleCode.',
        );
      }

      if (task.assigneeUserId) {
        await this.ensureActiveUserInOrganization(task.assigneeUserId, organizationId);
      }
    }
  }
}
