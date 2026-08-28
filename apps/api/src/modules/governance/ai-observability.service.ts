import { Injectable } from '@nestjs/common';
import { AgentRiskLevel, AgentRunStatus, Prisma } from '@prisma/client';

import { AgentImpactTypes, AgentMetricTypes } from './governance.constants';
import { GovernanceRepository } from './governance.repository';
import { OperationalImpactMetric } from './governance.types';

@Injectable()
export class AiObservabilityService {
  constructor(private readonly governanceRepository: GovernanceRepository) {}

  recordRunStarted(params: { organizationId?: string | null; agentRunId: string }) {
    return this.recordMetric({
      organizationId: params.organizationId ?? null,
      agentRunId: params.agentRunId,
      metricType: AgentMetricTypes.runStarted,
      metricValue: 1,
    });
  }

  recordRunCompleted(params: {
    organizationId?: string | null;
    agentRunId: string;
    finalStatus: AgentRunStatus;
    proposalCount?: number;
    confidence?: number | null;
  }) {
    return Promise.all([
      this.recordMetric({
        organizationId: params.organizationId ?? null,
        agentRunId: params.agentRunId,
        metricType:
          params.finalStatus === AgentRunStatus.FAILED ? AgentMetricTypes.runFailed : AgentMetricTypes.runCompleted,
        metricValue: 1,
      }),
      typeof params.proposalCount === 'number'
        ? this.recordMetric({
            organizationId: params.organizationId ?? null,
            agentRunId: params.agentRunId,
            metricType: AgentMetricTypes.actionProposalCount,
            metricValue: params.proposalCount,
          })
        : Promise.resolve(null),
      typeof params.confidence === 'number'
        ? this.recordMetric({
            organizationId: params.organizationId ?? null,
            agentRunId: params.agentRunId,
            metricType: AgentMetricTypes.decisionConfidence,
            metricValue: params.confidence,
          })
        : Promise.resolve(null),
    ]);
  }

  recordReasoningLatency(params: {
    organizationId?: string | null;
    agentRunId: string;
    latencyMs: number;
    model: string;
  }) {
    return this.recordMetric({
      organizationId: params.organizationId ?? null,
      agentRunId: params.agentRunId,
      metricType: AgentMetricTypes.reasoningLatencyMs,
      metricValue: params.latencyMs,
      metricUnit: 'ms',
      metadata: { model: params.model } as Prisma.InputJsonValue,
    });
  }

  recordActionExecution(params: {
    organizationId?: string | null;
    agentRunId: string;
    actionType: string;
    executionStatus: string;
  }) {
    const metricType =
      params.executionStatus === 'BLOCKED'
        ? AgentMetricTypes.actionsBlocked
        : params.executionStatus === 'PENDING_APPROVAL'
          ? AgentMetricTypes.approvalRequired
          : AgentMetricTypes.actionsExecuted;

    return this.recordMetric({
      organizationId: params.organizationId ?? null,
      agentRunId: params.agentRunId,
      metricType,
      metricValue: 1,
      metadata: {
        actionType: params.actionType,
        executionStatus: params.executionStatus,
      } as Prisma.InputJsonValue,
    });
  }

  recordVerificationOutcome(params: {
    organizationId?: string | null;
    agentRunId: string;
    passRate: number;
    finalStatus: AgentRunStatus;
  }) {
    return this.recordMetric({
      organizationId: params.organizationId ?? null,
      agentRunId: params.agentRunId,
      metricType: AgentMetricTypes.verificationPassRate,
      metricValue: params.passRate,
      metadata: { finalStatus: params.finalStatus } as Prisma.InputJsonValue,
    });
  }

  recordOperationalImpact(input: OperationalImpactMetric) {
    return this.governanceRepository.createOperationalImpact({
      ...(input.organizationId
        ? { organization: { connect: { id: input.organizationId } } }
        : {}),
      agentRun: { connect: { id: input.agentRunId } },
      impactType: input.impactType,
      baselineValue: input.baselineValue ?? null,
      observedValue: input.observedValue ?? null,
      delta: input.delta ?? null,
      evaluationWindowStart: input.evaluationWindowStart,
      evaluationWindowEnd: input.evaluationWindowEnd,
      summary: input.summary,
      metadata: input.metadata,
    });
  }

  async recordDefaultImpact(params: {
    organizationId?: string | null;
    agentRunId: string;
    actionType: string;
    passed: boolean;
  }) {
    const impactType =
      params.actionType === 'ASSIGN_WORKFORCE_TO_SHIFT'
        ? AgentImpactTypes.scheduleCoverageImprovement
        : params.actionType === 'ESCALATE_INCIDENT'
          ? AgentImpactTypes.incidentResolutionSpeed
          : params.actionType === 'SCHEDULE_ASSET_MAINTENANCE'
            ? AgentImpactTypes.assetReadinessImprovement
            : AgentImpactTypes.workforceCoverageImprovement;

    return this.recordOperationalImpact({
      organizationId: params.organizationId ?? null,
      agentRunId: params.agentRunId,
      impactType,
      baselineValue: 0,
      observedValue: params.passed ? 1 : 0,
      delta: params.passed ? 1 : 0,
      evaluationWindowStart: new Date(Date.now() - 5 * 60 * 1000),
      evaluationWindowEnd: new Date(),
      summary: params.passed
        ? `Observed positive ${impactType.toLowerCase()} signal after ${params.actionType}.`
        : `No positive ${impactType.toLowerCase()} signal observed after ${params.actionType}.`,
    });
  }

  private recordMetric(params: {
    organizationId?: string | null;
    agentRunId: string;
    metricType: string;
    metricValue: number;
    metricUnit?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.governanceRepository.createExecutionMetric({
      ...(params.organizationId
        ? { organization: { connect: { id: params.organizationId } } }
        : {}),
      agentRun: { connect: { id: params.agentRunId } },
      metricType: params.metricType,
      metricValue: params.metricValue,
      metricUnit: params.metricUnit ?? null,
      metadata: params.metadata,
    });
  }
}
