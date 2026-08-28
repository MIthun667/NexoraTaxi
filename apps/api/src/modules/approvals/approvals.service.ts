import {
  ApprovalDecisionType,
  ApprovalRequestStatus,
  ApprovalStepStatus,
  NotificationCategory,
  NotificationSeverity,
  Prisma,
  UserStatus,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
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
import { ActOnApprovalStepDto } from './dto/act-on-approval-step.dto';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';
import { CreateApprovalStepDto } from './dto/create-approval-step.dto';
import { QueryApprovalQueueDto } from './dto/query-approval-queue.dto';

const approvalStepSelect = {
  id: true,
  stepKey: true,
  title: true,
  description: true,
  sequenceOrder: true,
  status: true,
  approverUserId: true,
  approverRoleCode: true,
  dueAt: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ApprovalStepSelect;

const approvalRequestSelect = {
  id: true,
  organizationId: true,
  workflowInstanceId: true,
  entityType: true,
  entityId: true,
  title: true,
  description: true,
  status: true,
  requestedByUserId: true,
  submittedAt: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  steps: {
    select: approvalStepSelect,
    orderBy: [{ sequenceOrder: 'asc' }],
  },
} satisfies Prisma.ApprovalRequestSelect;

const approvalStepDetailSelect = {
  ...approvalStepSelect,
  approvalRequest: {
    select: {
      id: true,
      organizationId: true,
      entityType: true,
      entityId: true,
      title: true,
      status: true,
      workflowInstanceId: true,
    },
  },
  decisions: {
    select: {
      id: true,
      actorUserId: true,
      decisionType: true,
      comment: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'desc' }],
  },
} satisfies Prisma.ApprovalStepSelect;

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async createRequest(dto: CreateApprovalRequestDto) {
    if (dto.steps.length === 0) {
      throw new BadRequestException('Approval requests require at least one approval step.');
    }

    const duplicateSequence = new Set<number>();
    for (const step of dto.steps) {
      if (duplicateSequence.has(step.sequenceOrder)) {
        throw new BadRequestException('Approval step sequenceOrder values must be unique.');
      }
      duplicateSequence.add(step.sequenceOrder);
    }

    await this.ensureOrganizationExists(dto.organizationId);
    await this.ensureActiveUserInOrganization(dto.requestedByUserId, dto.organizationId);

    if (dto.workflowInstanceId) {
      await this.ensureWorkflowInstanceBelongsToOrganization(
        dto.workflowInstanceId,
        dto.organizationId,
      );
    }

    await this.validateStepAssignments(dto.organizationId, dto.steps);

    const requestId = randomUUID();
    const orderedSteps = [...dto.steps].sort(
      (left, right) => left.sequenceOrder - right.sequenceOrder,
    );
    const firstSequence = orderedSteps[0]?.sequenceOrder;
    const stepRows = orderedSteps.map((step) =>
      this.buildApprovalStepRow(requestId, step, step.sequenceOrder === firstSequence),
    );

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.approvalRequest.create({
        data: {
          id: requestId,
          organizationId: dto.organizationId,
          workflowInstanceId: dto.workflowInstanceId ?? null,
          entityType: dto.entityType,
          entityId: dto.entityId,
          title: dto.title,
          description: dto.description,
          status: ApprovalRequestStatus.IN_PROGRESS,
          requestedByUserId: dto.requestedByUserId,
        },
      });

      await transaction.approvalStep.createMany({
        data: stepRows,
      });
    });

    const request = await this.prismaService.approvalRequest.findUnique({
      where: { id: requestId },
      select: approvalRequestSelect,
    });

    const firstPendingStep = request?.steps.find(
      (step) => step.status === ApprovalStepStatus.PENDING,
    );

    await this.domainEventsService.publish({
      organizationId: dto.organizationId,
      eventType: 'approval.request.created',
      aggregateType: 'approval-request',
      aggregateId: requestId,
      triggeredByUserId: dto.requestedByUserId,
      payload: {
        notification: {
          category: NotificationCategory.APPROVAL,
          severity: NotificationSeverity.INFO,
          title: 'Approval request created',
          message: dto.title,
          actionUrl: `/approvals/${requestId}`,
          entityType: 'approval-request',
          entityId: requestId,
          metadata: {
            requestedByUserId: dto.requestedByUserId,
          },
        },
        recipients: {
          userIds: [dto.requestedByUserId],
        },
      },
    });

    if (firstPendingStep) {
      await this.domainEventsService.publish({
        organizationId: dto.organizationId,
        eventType: 'approval.step.assigned',
        aggregateType: 'approval-step',
        aggregateId: firstPendingStep.id,
        triggeredByUserId: dto.requestedByUserId,
        payload: {
          notification: {
            category: NotificationCategory.APPROVAL,
            severity: NotificationSeverity.WARNING,
            title: 'Approval step assigned',
            message: `Approval action is required for ${dto.title}.`,
            actionUrl: `/approvals/${requestId}`,
            entityType: 'approval-step',
            entityId: firstPendingStep.id,
            metadata: {
              approvalRequestId: requestId,
              stepKey: firstPendingStep.stepKey,
            },
          },
          recipients: {
            userIds: firstPendingStep.approverUserId ? [firstPendingStep.approverUserId] : [],
            roleCodes: firstPendingStep.approverRoleCode ? [firstPendingStep.approverRoleCode] : [],
          },
        },
      });
    }

    return buildSuccessResponse('Approval request created successfully.', request);
  }

  async getRequest(id: string) {
    const request = await this.prismaService.approvalRequest.findUnique({
      where: { id },
      select: approvalRequestSelect,
    });

    if (!request) {
      throw new NotFoundException('Approval request not found.');
    }

    return buildSuccessResponse('Approval request retrieved successfully.', request);
  }

  async getMyQueue(principal: CurrentPrincipal, query: QueryApprovalQueueDto) {
    const { page, limit, skip } = resolvePagination(query);

    const where: Prisma.ApprovalStepWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      approvalRequest: {
        ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      },
      OR: [
        { approverUserId: principal.userId },
        ...(principal.roles.length > 0
          ? [{ approverRoleCode: { in: principal.roles } }]
          : []),
      ],
    };

    const [steps, total] = await this.prismaService.$transaction([
      this.prismaService.approvalStep.findMany({
        where,
        select: {
          ...approvalStepSelect,
          approvalRequest: {
            select: {
              id: true,
              title: true,
              entityType: true,
              entityId: true,
              status: true,
              organizationId: true,
            },
          },
        },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.approvalStep.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Assigned approval queue retrieved successfully.',
      steps,
      buildPaginationMeta({ page, limit, total }),
    );
  }

  findRequestsForOrganization(organizationId: string, limit = 20) {
    return this.prismaService.approvalRequest.findMany({
      where: { organizationId },
      select: approvalRequestSelect,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  findPendingOverdueStepsForOrganization(organizationId: string, limit = 10) {
    return this.prismaService.approvalStep.findMany({
      where: {
        approvalRequest: { organizationId },
        status: ApprovalStepStatus.PENDING,
        dueAt: { lt: new Date() },
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        updatedAt: true,
        approvalRequest: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  countPendingStepsForOrganization(organizationId: string) {
    return this.prismaService.approvalStep.count({
      where: {
        approvalRequest: { organizationId },
        status: ApprovalStepStatus.PENDING,
      },
    });
  }

  async getStep(id: string) {
    const step = await this.prismaService.approvalStep.findUnique({
      where: { id },
      select: approvalStepDetailSelect,
    });

    if (!step) {
      throw new NotFoundException('Approval step not found.');
    }

    return buildSuccessResponse('Approval step retrieved successfully.', step);
  }

  async actOnStep(id: string, principal: CurrentPrincipal, dto: ActOnApprovalStepDto) {
    const step = await this.prismaService.approvalStep.findUnique({
      where: { id },
      select: {
        id: true,
        sequenceOrder: true,
        status: true,
        approverUserId: true,
        approverRoleCode: true,
        approvalRequestId: true,
          approvalRequest: {
            select: {
              id: true,
              organizationId: true,
              status: true,
              requestedByUserId: true,
            },
          },
        },
    });

    if (!step) {
      throw new NotFoundException('Approval step not found.');
    }

    if (
      step.approvalRequest.status === ApprovalRequestStatus.APPROVED ||
      step.approvalRequest.status === ApprovalRequestStatus.REJECTED ||
      step.approvalRequest.status === ApprovalRequestStatus.CANCELLED
    ) {
      throw new BadRequestException('Resolved approval requests cannot accept new decisions.');
    }

    const isAssignedUser = step.approverUserId === principal.userId;
    const hasAssignedRole =
      step.approverRoleCode !== null &&
      step.approverRoleCode !== undefined &&
      principal.roles.includes(step.approverRoleCode);

    if (!isAssignedUser && !hasAssignedRole) {
      throw new BadRequestException('Current principal is not assigned to this approval step.');
    }

    if (step.status !== ApprovalStepStatus.PENDING) {
      throw new BadRequestException('Only pending approval steps may be acted upon.');
    }

    await this.ensureActiveUserInOrganization(principal.userId, step.approvalRequest.organizationId);

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.approvalDecision.create({
        data: {
          approvalStepId: id,
          actorUserId: principal.userId,
          decisionType: dto.decisionType,
          comment: dto.comment,
          metadata:
            dto.metadata !== undefined
              ? (dto.metadata as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      });

      if (dto.decisionType === ApprovalDecisionType.COMMENT) {
        return;
      }

      if (
        dto.decisionType === ApprovalDecisionType.REJECT ||
        dto.decisionType === ApprovalDecisionType.SEND_BACK
      ) {
        await transaction.approvalStep.update({
          where: { id },
          data: {
            status: ApprovalStepStatus.REJECTED,
            resolvedAt: new Date(),
          },
        });

        await transaction.approvalRequest.update({
          where: { id: step.approvalRequestId },
          data: {
            status: ApprovalRequestStatus.REJECTED,
            resolvedAt: new Date(),
          },
        });

        return;
      }

      if (dto.decisionType === ApprovalDecisionType.CANCEL) {
        await transaction.approvalStep.update({
          where: { id },
          data: {
            status: ApprovalStepStatus.CANCELLED,
            resolvedAt: new Date(),
          },
        });

        await transaction.approvalRequest.update({
          where: { id: step.approvalRequestId },
          data: {
            status: ApprovalRequestStatus.CANCELLED,
            resolvedAt: new Date(),
          },
        });

        return;
      }

      await transaction.approvalStep.update({
        where: { id },
        data: {
          status: ApprovalStepStatus.APPROVED,
          resolvedAt: new Date(),
        },
      });

      const nextStep = await transaction.approvalStep.findFirst({
        where: {
          approvalRequestId: step.approvalRequestId,
          sequenceOrder: {
            gt: step.sequenceOrder,
          },
        },
        orderBy: [{ sequenceOrder: 'asc' }],
        select: {
          id: true,
        },
      });

      if (nextStep) {
        await transaction.approvalStep.update({
          where: { id: nextStep.id },
          data: {
            status: ApprovalStepStatus.PENDING,
          },
        });

        await transaction.approvalRequest.update({
          where: { id: step.approvalRequestId },
          data: {
            status: ApprovalRequestStatus.IN_PROGRESS,
          },
        });
        return;
      }

      await transaction.approvalRequest.update({
        where: { id: step.approvalRequestId },
        data: {
          status: ApprovalRequestStatus.APPROVED,
          resolvedAt: new Date(),
        },
      });
    });

    const updatedStep = await this.prismaService.approvalStep.findUnique({
      where: { id },
      select: approvalStepDetailSelect,
    });

    const nextPendingStep =
      dto.decisionType === ApprovalDecisionType.APPROVE
        ? await this.prismaService.approvalStep.findFirst({
            where: {
              approvalRequestId: step.approvalRequestId,
              status: ApprovalStepStatus.PENDING,
              id: { not: id },
            },
            select: {
              id: true,
              stepKey: true,
              approverUserId: true,
              approverRoleCode: true,
            },
            orderBy: [{ sequenceOrder: 'asc' }],
          })
        : null;

    await this.auditService.record({
      action: 'approval.step.decision',
      entityType: 'approval-step',
      entityId: id,
      organizationId: step.approvalRequest.organizationId,
      actorUserId: principal.userId,
      summary: `Approval step ${id} received ${dto.decisionType.toLowerCase()} decision.`,
      metadata: {
        decisionType: dto.decisionType,
        comment: dto.comment ?? null,
        approvalRequestId: step.approvalRequestId,
      },
    });

    await this.domainEventsService.publish({
      organizationId: step.approvalRequest.organizationId,
      eventType: 'approval.step.decision.recorded',
      aggregateType: 'approval-step',
      aggregateId: id,
      triggeredByUserId: principal.userId,
      payload: {
        notification: {
          category: NotificationCategory.APPROVAL,
          severity:
            dto.decisionType === ApprovalDecisionType.REJECT ||
            dto.decisionType === ApprovalDecisionType.SEND_BACK
              ? NotificationSeverity.CRITICAL
              : NotificationSeverity.INFO,
          title: 'Approval decision recorded',
          message: `Approval step decision recorded: ${dto.decisionType.toLowerCase().replaceAll('_', ' ')}.`,
          actionUrl: `/approvals/${step.approvalRequestId}`,
          entityType: 'approval-step',
          entityId: id,
          metadata: {
            approvalRequestId: step.approvalRequestId,
            decisionType: dto.decisionType,
            comment: dto.comment ?? null,
          },
        },
        recipients: {
          userIds: [step.approvalRequest.requestedByUserId],
        },
      },
    });

    if (nextPendingStep) {
      await this.domainEventsService.publish({
        organizationId: step.approvalRequest.organizationId,
        eventType: 'approval.step.assigned',
        aggregateType: 'approval-step',
        aggregateId: nextPendingStep.id,
        triggeredByUserId: principal.userId,
        payload: {
          notification: {
            category: NotificationCategory.APPROVAL,
            severity: NotificationSeverity.WARNING,
            title: 'Approval step assigned',
            message: 'A new approval decision is awaiting your review.',
            actionUrl: `/approvals/${step.approvalRequestId}`,
            entityType: 'approval-step',
            entityId: nextPendingStep.id,
            metadata: {
              approvalRequestId: step.approvalRequestId,
              stepKey: nextPendingStep.stepKey,
            },
          },
          recipients: {
            userIds: nextPendingStep.approverUserId ? [nextPendingStep.approverUserId] : [],
            roleCodes: nextPendingStep.approverRoleCode ? [nextPendingStep.approverRoleCode] : [],
          },
        },
      });
    }

    return buildSuccessResponse('Approval decision processed successfully.', updatedStep);
  }

  private buildApprovalStepRow(
    requestId: string,
    step: CreateApprovalStepDto,
    isFirstActionableStep: boolean,
  ) {
    if (!step.approverUserId && !step.approverRoleCode) {
      throw new BadRequestException(
        'Approval steps require either approverUserId or approverRoleCode.',
      );
    }

    return {
      id: randomUUID(),
      approvalRequestId: requestId,
      stepKey: step.stepKey,
      title: step.title,
      description: step.description,
      sequenceOrder: step.sequenceOrder,
      status: isFirstActionableStep ? ApprovalStepStatus.PENDING : ApprovalStepStatus.SKIPPED,
      approverUserId: step.approverUserId ?? null,
      approverRoleCode: step.approverRoleCode ?? null,
      dueAt: step.dueAt ? new Date(step.dueAt) : null,
      resolvedAt: null,
    } satisfies Prisma.ApprovalStepCreateManyInput;
  }

  private async ensureOrganizationExists(organizationId: string) {
    const organization = await this.prismaService.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
      },
      select: { id: true },
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
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }
  }

  private async ensureWorkflowInstanceBelongsToOrganization(
    workflowInstanceId: string,
    organizationId: string,
  ) {
    const workflowInstance = await this.prismaService.workflowInstance.findFirst({
      where: {
        id: workflowInstanceId,
        organizationId,
      },
      select: { id: true },
    });

    if (!workflowInstance) {
      throw new NotFoundException('Workflow instance not found.');
    }
  }

  private async validateStepAssignments(
    organizationId: string,
    steps: CreateApprovalStepDto[],
  ) {
    for (const step of steps) {
      if (!step.approverUserId && !step.approverRoleCode) {
        throw new BadRequestException(
          'Approval steps require either approverUserId or approverRoleCode.',
        );
      }

      if (step.approverUserId) {
        await this.ensureActiveUserInOrganization(step.approverUserId, organizationId);
      }
    }
  }
}
