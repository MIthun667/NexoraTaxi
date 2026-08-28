import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalsService } from '../../approvals/approvals.service';
import { WorkflowsService } from '../../workflows/workflows.service';
import { ActionExecutionContext, ActionExecutionRequest, ActionExecutionResult, ActionHandler } from '../action.types';

@Injectable()
export class GovernanceActionHandler implements ActionHandler {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly workflowsService: WorkflowsService,
    private readonly approvalsService: ApprovalsService,
  ) {}

  supportedActionTypes() {
    return ['CREATE_WORKFLOW_TASK', 'ESCALATE_APPROVAL_REQUEST'];
  }

  async execute(
    request: ActionExecutionRequest,
    context: ActionExecutionContext,
  ): Promise<ActionExecutionResult> {
    const actorUserId = context.actorUserId;
    if (!actorUserId) {
      throw new NotFoundException(
        'A requesting user is required to convert approved agent proposals into governance follow-up.',
      );
    }

    if (request.actionType === 'CREATE_WORKFLOW_TASK') {
      const payload = request.payload ?? {};
      const definition =
        (await this.findWorkflowDefinitionByCode(
          typeof payload.workflowDefinitionCode === 'string'
            ? payload.workflowDefinitionCode
            : 'agent-follow-up',
        )) ??
        (await this.prismaService.workflowDefinition.create({
          data: {
            code: 'agent-follow-up',
            name: 'Agent Follow-up Workflow',
            description:
              'Generic workflow used for approved agent follow-up tasks that still require human review.',
            moduleKey: 'agents',
            version: 1,
            isActive: true,
          },
          select: { id: true },
        }));

      const response = await this.workflowsService.createInstance({
        definitionId: definition.id,
        organizationId: context.organizationId,
        entityType: request.targetEntityType ?? 'agent-action-proposal',
        entityId: request.targetEntityId ?? request.proposalId,
        createdByUserId: actorUserId,
        initialTasks: [
          {
            taskKey:
              typeof payload.taskKey === 'string' ? payload.taskKey : 'agent-follow-up-review',
            title:
              typeof payload.taskTitle === 'string' ? payload.taskTitle : 'Review agent follow-up',
            description:
              typeof payload.taskDescription === 'string'
                ? payload.taskDescription
                : request.summary,
            assigneeRoleCode:
              typeof payload.assigneeRoleCode === 'string'
                ? payload.assigneeRoleCode
                : 'platform.admin',
            dueAt:
              typeof payload.dueAt === 'string'
                ? payload.dueAt
                : new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          },
        ],
      });
      if (!response.data) {
        throw new NotFoundException('Workflow follow-up could not be created.');
      }

      return {
        success: true,
        executionStatus: 'SUCCEEDED',
        resultSummary: 'Workflow follow-up created successfully.',
        entityType: 'workflow-instance',
        entityId: response.data.id,
      };
    }

    const payload = request.payload ?? {};
    const response = await this.approvalsService.createRequest({
      organizationId: context.organizationId,
      entityType: request.targetEntityType ?? 'agent-action-proposal',
      entityId: request.targetEntityId ?? request.proposalId,
      title:
        typeof payload.title === 'string'
          ? payload.title
          : `Review ${request.summary}`.slice(0, 160),
      description:
        typeof payload.description === 'string' ? payload.description : request.summary,
      requestedByUserId: actorUserId,
      steps: [
        {
          stepKey:
            typeof payload.stepKey === 'string'
              ? payload.stepKey
              : 'agent-escalation-review',
          title:
            typeof payload.stepTitle === 'string'
              ? payload.stepTitle
              : 'Review agent escalation',
          description:
            typeof payload.stepDescription === 'string'
              ? payload.stepDescription
              : request.summary,
          sequenceOrder: 1,
          approverRoleCode:
            typeof payload.approverRoleCode === 'string'
              ? payload.approverRoleCode
              : 'platform.admin',
        },
      ],
    });
    if (!response.data) {
      throw new NotFoundException('Approval escalation request could not be created.');
    }

    return {
      success: true,
      executionStatus: 'SUCCEEDED',
      resultSummary: 'Approval escalation request created successfully.',
      entityType: 'approval-request',
      entityId: response.data.id,
    };
  }

  private findWorkflowDefinitionByCode(code: string) {
    return this.prismaService.workflowDefinition.findUnique({
      where: { code },
      select: { id: true },
    });
  }
}
