import { Injectable } from '@nestjs/common';
import { ApprovalStepStatus, WorkflowTaskStatus } from '@prisma/client';

import { SignalCategory, SignalSeverity } from '../../../common/signals';
import { ApprovalsService } from '../../approvals/approvals.service';
import { WorkflowsService } from '../../workflows/workflows.service';
import { BaseAnomalyDetector } from '../base-anomaly-detector';
import {
  AnomalyEvaluationContext,
  AnomalyEvaluationResult,
} from '../anomalies.types';

@Injectable()
export class StalledWorkflowAnomalyDetector extends BaseAnomalyDetector {
  readonly key = 'workflows.stalled-bottleneck-anomaly';
  readonly category = SignalCategory.workflows;
  readonly description =
    'Detects overdue approval steps and overdue open workflow tasks that indicate process bottlenecks.';
  readonly supportsTenantScoping = true;
  readonly sourceModule = 'intelligence';

  constructor(
    private readonly approvalsService: ApprovalsService,
    private readonly workflowsService: WorkflowsService,
  ) {
    super();
  }

  async evaluate(
    context: AnomalyEvaluationContext,
  ): Promise<AnomalyEvaluationResult> {
    if (!context.organizationId) {
      return {
        signals: [],
        evidence: null,
        metrics: null,
        thresholds: [],
      };
    }

    const now = new Date();
    const [overdueApprovalSteps, pendingApprovalStepCount, overdueWorkflowTasks] =
      await Promise.all([
        this.approvalsService.findPendingOverdueStepsForOrganization(
          context.organizationId,
          10,
        ),
        this.approvalsService.countPendingStepsForOrganization(
          context.organizationId,
        ),
        this.workflowsService.findOverdueOpenTasksForOrganization(
          context.organizationId,
          10,
        ),
      ]);

    const approvalSignals = overdueApprovalSteps.map((step) => {
      const overdueHours = step.dueAt
        ? Math.max(
            0,
            Math.round(
              (now.getTime() - step.dueAt.getTime()) / (60 * 60 * 1000),
            ),
          )
        : 0;

      return this.buildSignal({
        signalType: 'workflows.approval.bottleneck_detected',
        title: `Overdue approval step: ${step.title}`,
        summary: `${step.title} for ${step.approvalRequest.title} has remained pending past its due time by ${overdueHours} hours.`,
        severity:
          overdueHours >= 48 ? SignalSeverity.high : SignalSeverity.medium,
        entityType: 'approval-step',
        entityId: step.id,
        relatedEntityIds: [step.approvalRequest.id],
        organizationId: context.organizationId,
        evidence: {
          approvalRequestId: step.approvalRequest.id,
          approvalRequestTitle: step.approvalRequest.title,
          status: step.status,
          dueAt: step.dueAt,
          updatedAt: step.updatedAt,
        },
        metrics: {
          overdueHours,
          pendingApprovalStepCount,
        },
        metadata: {
          detectorVersion: 'v1',
          sourceStatus: ApprovalStepStatus.PENDING,
        },
      });
    });

    const workflowSignals = overdueWorkflowTasks.map((task) => {
      const overdueHours = task.dueAt
        ? Math.max(
            0,
            Math.round(
              (now.getTime() - task.dueAt.getTime()) / (60 * 60 * 1000),
            ),
          )
        : 0;

      return this.buildSignal({
        signalType: 'workflows.task.stalled_detected',
        title: `Overdue workflow task: ${task.title}`,
        summary: `${task.title} has remained ${task.status.toLowerCase().replace(/_/g, ' ')} past its due time by ${overdueHours} hours.`,
        severity:
          task.status === WorkflowTaskStatus.IN_PROGRESS && overdueHours >= 48
            ? SignalSeverity.high
            : SignalSeverity.medium,
        entityType: 'workflow-task',
        entityId: task.id,
        relatedEntityIds: [task.instance.id],
        organizationId: context.organizationId,
        evidence: {
          workflowInstanceId: task.instance.id,
          workflowEntityType: task.instance.entityType,
          workflowEntityId: task.instance.entityId,
          status: task.status,
          dueAt: task.dueAt,
          updatedAt: task.updatedAt,
        },
        metrics: {
          overdueHours,
        },
        metadata: {
          detectorVersion: 'v1',
        },
      });
    });

    return {
      signals: [...approvalSignals, ...workflowSignals],
      evidence: {
        overdueApprovalStepCount: overdueApprovalSteps.length,
        overdueWorkflowTaskCount: overdueWorkflowTasks.length,
        evaluationBasis:
          'workflow bottlenecks are approximated using overdue pending approval steps and overdue open workflow tasks',
      },
      metrics: {
        pendingApprovalStepCount,
        overdueApprovalStepCount: overdueApprovalSteps.length,
        overdueWorkflowTaskCount: overdueWorkflowTasks.length,
      },
      thresholds: [
        {
          key: 'overdue_state',
          label: 'Overdue condition',
          value: 'dueAt earlier than current time',
        },
        {
          key: 'high_severity_overdue_hours',
          label: 'High severity threshold',
          value: 48,
          unit: 'hours',
        },
      ],
    };
  }
}
