import { ActionExecutionStatus, AgentActionProposalStatus, AgentRunStatus, Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';

import { buildActionProposal } from '../../common/actions';
import { RequestContextStorage } from '../../common/utils/request-context.util';
import { ApprovalsService } from '../approvals/approvals.service';
import { VerificationService } from '../agents/verification/verification.service';
import { AiObservabilityService } from '../governance/ai-observability.service';
import { AiPolicyMonitorService } from '../governance/ai-policy-monitor.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { AlertingService } from '../observability/alerting.service';
import { ActionAuditService } from './action-audit.service';
import { ActionDispatcherService } from './action-dispatcher.service';
import { ActionPolicyService } from './action-policy.service';
import { ActionRepository } from './action.repository';
import { ActionExecutionContext, ActionExecutionRequest } from './action.types';

@Injectable()
export class ActionExecutionService {
  constructor(
    private readonly actionRepository: ActionRepository,
    private readonly actionPolicyService: ActionPolicyService,
    private readonly actionDispatcherService: ActionDispatcherService,
    private readonly actionAuditService: ActionAuditService,
    private readonly approvalsService: ApprovalsService,
    private readonly verificationService: VerificationService,
    private readonly aiObservabilityService: AiObservabilityService,
    private readonly aiPolicyMonitorService: AiPolicyMonitorService,
    private readonly domainEventsService: DomainEventsService,
    private readonly alertingService: AlertingService,
  ) {}

  async executeProposal(proposalId: string, actorUserId?: string | null) {
    const proposal = await this.getProposalOrThrow(proposalId);
    const request = this.buildRequest(proposal);
    const context: ActionExecutionContext = {
      organizationId: request.organizationId,
      proposalId,
      actorUserId: actorUserId ?? proposal.agentRun.triggeredByUserId ?? null,
      correlationId: RequestContextStorage.getRequestId() ?? null,
    };

    const existingExecution = await this.actionRepository.findExecutionByIdempotencyKey(
      request.idempotencyKey,
    );
    if (existingExecution && existingExecution.executionStatus === ActionExecutionStatus.SUCCEEDED) {
      return existingExecution;
    }

    const executionLog = await this.actionRepository.createExecutionLog({
      proposalId,
      organizationId: request.organizationId,
      actionType: request.actionType,
      executionStatus: ActionExecutionStatus.PENDING,
      idempotencyKey: request.idempotencyKey,
      executedByUserId: context.actorUserId ?? null,
      targetEntityType: request.targetEntityType ?? null,
      targetEntityId: request.targetEntityId ?? null,
      metadata: {
        agentRunId: proposal.agentRunId,
        riskLevel: proposal.riskLevel,
      } as Prisma.InputJsonValue,
    });

    await this.actionAuditService.record('action.execution.requested', {
      proposalId,
      organizationId: request.organizationId,
      actorUserId: context.actorUserId ?? null,
      summary: `Action ${request.actionType} requested for proposal ${proposalId}.`,
      metadata: { idempotencyKey: request.idempotencyKey },
    });

    const policy = await this.actionPolicyService.evaluate(proposal, request);
    if (!policy.allowed) {
      await this.aiPolicyMonitorService.recordViolation({
        organizationId: request.organizationId,
        agentRunId: proposal.agentRunId,
        violationType: 'ACTION_BLOCKED',
        severity: policy.effectiveRisk,
        description: policy.reasons.join('; ') || `Action ${request.actionType} blocked by policy.`,
        metadata: {
          proposalId,
          actionType: request.actionType,
        } as Prisma.InputJsonValue,
      });
      await this.aiObservabilityService.recordActionExecution({
        organizationId: request.organizationId,
        agentRunId: proposal.agentRunId,
        actionType: request.actionType,
        executionStatus: ActionExecutionStatus.BLOCKED,
      });
      await this.actionRepository.updateExecutionLog(executionLog.id, {
        executionStatus: ActionExecutionStatus.BLOCKED,
        resultSummary: 'Action blocked by policy.',
        errorMessage: policy.reasons.join('; '),
        finishedAt: new Date(),
      });
      await this.actionAuditService.record('action.execution.blocked', {
        proposalId,
        organizationId: request.organizationId,
        actorUserId: context.actorUserId ?? null,
        summary: `Action ${request.actionType} blocked by policy.`,
        metadata: { reasons: policy.reasons },
      });
      await this.domainEventsService.publish({
        organizationId: request.organizationId,
        eventType: 'action.execution.failed',
        aggregateType: 'agent-action-proposal',
        aggregateId: proposalId,
        triggeredByUserId: context.actorUserId ?? null,
        payload: {
          actionType: request.actionType,
          status: ActionExecutionStatus.BLOCKED,
          reasons: policy.reasons,
        },
      });
      return this.actionRepository.findExecutionByIdempotencyKey(request.idempotencyKey);
    }

    if (policy.requiresApproval && proposal.status !== AgentActionProposalStatus.APPROVED) {
      const requestedByUserId =
        context.actorUserId ?? proposal.agentRun.triggeredByUserId ?? null;
      if (!requestedByUserId) {
        throw new NotFoundException(
          'Approval-required action cannot be processed because no requesting user could be resolved.',
        );
      }

      const approval = await this.approvalsService.createRequest({
        organizationId: request.organizationId,
        entityType: 'agent-action-proposal',
        entityId: proposalId,
        title: `Approval required for ${request.actionType}`,
        description: request.summary,
        requestedByUserId,
        steps: [
          {
            stepKey: 'agent-action-review',
            title: 'Review agent action proposal',
            description: request.summary,
            sequenceOrder: 1,
            approverRoleCode: 'platform.admin',
          },
        ],
      });
      const approvalRequestId = approval.data?.id;
      if (!approvalRequestId) {
        throw new NotFoundException('Approval request was created without a returned identifier.');
      }

      await this.aiObservabilityService.recordActionExecution({
        organizationId: request.organizationId,
        agentRunId: proposal.agentRunId,
        actionType: request.actionType,
        executionStatus: ActionExecutionStatus.PENDING_APPROVAL,
      });
      await this.actionRepository.updateExecutionLog(executionLog.id, {
        executionStatus: ActionExecutionStatus.PENDING_APPROVAL,
        approvalRequestId,
        resultSummary: 'Approval required before execution.',
        finishedAt: new Date(),
      });
      await this.actionRepository.updateRunStatus(
        proposal.agentRunId,
        AgentRunStatus.WAITING_APPROVAL,
        'Agent action proposal is waiting for approval before execution.',
      );
      await this.actionAuditService.record('action.execution.pending_approval', {
        proposalId,
        organizationId: request.organizationId,
        actorUserId: context.actorUserId ?? null,
        summary: `Action ${request.actionType} is pending approval.`,
        metadata: { approvalRequestId },
      });
      await this.domainEventsService.publish({
        organizationId: request.organizationId,
        eventType: 'action.execution.pending_approval',
        aggregateType: 'agent-action-proposal',
        aggregateId: proposalId,
        triggeredByUserId: context.actorUserId ?? null,
        payload: {
          actionType: request.actionType,
          approvalRequestId,
        },
      });
      return this.actionRepository.findExecutionByIdempotencyKey(request.idempotencyKey);
    }

    await this.actionRepository.updateExecutionLog(executionLog.id, {
      executionStatus: ActionExecutionStatus.EXECUTING,
    });

    try {
      const result = await this.actionDispatcherService.dispatch(request, context);
      const resolvedTargetEntityType = result.entityType ?? request.targetEntityType ?? null;
      const resolvedTargetEntityId = result.entityId ?? request.targetEntityId ?? null;

      await this.aiObservabilityService.recordActionExecution({
        organizationId: request.organizationId,
        agentRunId: proposal.agentRunId,
        actionType: request.actionType,
        executionStatus: result.executionStatus,
      });
      await this.actionRepository.updateExecutionLog(executionLog.id, {
        executionStatus: result.executionStatus,
        resultSummary: result.resultSummary,
        targetEntityType: resolvedTargetEntityType,
        targetEntityId: resolvedTargetEntityId,
        metadata: (result.metadata ?? null) as Prisma.InputJsonValue,
        finishedAt: new Date(),
      });
      await this.actionRepository.updateProposalStatus(proposalId, AgentActionProposalStatus.EXECUTED);
      await this.actionRepository.updateRunStatus(
        proposal.agentRunId,
        AgentRunStatus.ACTED,
        result.resultSummary,
      );

      await this.actionAuditService.record('action.execution.succeeded', {
        proposalId,
        organizationId: request.organizationId,
        actorUserId: context.actorUserId ?? null,
        summary: result.resultSummary,
        metadata: result.metadata ?? null,
      });

      await this.domainEventsService.publish({
        organizationId: request.organizationId,
        eventType: 'action.execution.succeeded',
        aggregateType: 'agent-action-proposal',
        aggregateId: proposalId,
        triggeredByUserId: context.actorUserId ?? null,
        payload: {
          actionType: request.actionType,
          executionStatus: result.executionStatus,
          resultSummary: result.resultSummary,
        },
      });

      if (result.executionStatus === ActionExecutionStatus.SUCCEEDED) {
        await this.verificationService.verifyActionExecution({
          organizationId: request.organizationId,
          agentRunId: proposal.agentRunId,
          actionProposalId: proposalId,
          actionExecutionLogId: executionLog.id,
          actionType: request.actionType,
          targetEntityType: resolvedTargetEntityType,
          targetEntityId: resolvedTargetEntityId,
          executionResult: {
            executionStatus: result.executionStatus,
            resultSummary: result.resultSummary,
            entityType: resolvedTargetEntityType,
            entityId: resolvedTargetEntityId,
            metadata: result.metadata ?? null,
          },
        });
      }

      return this.actionRepository.findExecutionByIdempotencyKey(request.idempotencyKey);
    } catch (error) {
      await this.aiObservabilityService.recordActionExecution({
        organizationId: request.organizationId,
        agentRunId: proposal.agentRunId,
        actionType: request.actionType,
        executionStatus: ActionExecutionStatus.FAILED,
      });
      await this.actionRepository.updateExecutionLog(executionLog.id, {
        executionStatus: ActionExecutionStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown action execution failure',
        finishedAt: new Date(),
      });
      await this.actionAuditService.record('action.execution.failed', {
        proposalId,
        organizationId: request.organizationId,
        actorUserId: context.actorUserId ?? null,
        summary: `Action ${request.actionType} failed.`,
        metadata: { reason: error instanceof Error ? error.message : 'Unknown action execution failure' },
      });
      await this.domainEventsService.publish({
        organizationId: request.organizationId,
        eventType: 'action.execution.failed',
        aggregateType: 'agent-action-proposal',
        aggregateId: proposalId,
        triggeredByUserId: context.actorUserId ?? null,
        payload: {
          actionType: request.actionType,
          status: ActionExecutionStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown action execution failure',
        },
      });

      await this.alertingService.raiseAlert({
        organizationId: request.organizationId,
        sourceModule: 'actions',
        alertType: 'action.execution.failure',
        severity: 'WARNING',
        title: `Action execution failed: ${request.actionType}`,
        summary: error instanceof Error ? error.message : 'Unknown action execution failure',
        correlationId: context.correlationId ?? null,
        metadata: {
          proposalId,
          agentRunId: proposal.agentRunId,
        },
      });
      throw error;
    }
  }

  private buildRequest(proposal: NonNullable<Awaited<ReturnType<ActionRepository['findProposalById']>>>) : ActionExecutionRequest {
    const canonicalProposal = buildActionProposal({
      proposalId: proposal.id,
      proposalType: proposal.actionType,
      summary: proposal.summary,
      sourceModule: 'actions',
      sourceSystem: 'agent',
      targetEntityType: proposal.targetEntityType ?? null,
      targetEntityId: proposal.targetEntityId ?? null,
      organizationId: proposal.agentRun.organizationId ?? null,
      requestedAction: proposal.actionType,
      proposedChanges:
        proposal.payload && typeof proposal.payload === 'object' && !Array.isArray(proposal.payload)
          ? (proposal.payload as Record<string, unknown>)
          : null,
      riskLevel: proposal.riskLevel,
      approvalRequired: proposal.requiresApproval,
      approvalStatus:
        proposal.status === AgentActionProposalStatus.APPROVAL_REQUIRED
          ? 'REQUIRED'
          : proposal.status === AgentActionProposalStatus.APPROVED
            ? 'APPROVED'
            : proposal.status === AgentActionProposalStatus.REJECTED
              ? 'REJECTED'
              : 'PENDING',
      executionStatus: 'PENDING',
      createdAt: proposal.createdAt,
    });

    return {
      proposalId: canonicalProposal.proposalId ?? proposal.id,
      organizationId: proposal.agentRun.organizationId ?? '',
      actionType: canonicalProposal.requestedAction,
      targetEntityType: canonicalProposal.targetEntityType ?? null,
      targetEntityId: canonicalProposal.targetEntityId ?? null,
      payload:
        proposal.payload && typeof proposal.payload === 'object' && !Array.isArray(proposal.payload)
          ? (proposal.payload as Record<string, unknown>)
          : null,
      summary: canonicalProposal.summary,
      idempotencyKey: `${proposal.id}:${proposal.actionType}:${proposal.targetEntityType ?? 'none'}:${proposal.targetEntityId ?? 'none'}`,
    };
  }

  private async getProposalOrThrow(proposalId: string) {
    const proposal = await this.actionRepository.findProposalById(proposalId);
    if (!proposal) {
      throw new NotFoundException('Agent action proposal not found.');
    }

    return proposal;
  }
}
