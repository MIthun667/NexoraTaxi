import { Injectable } from '@nestjs/common';
import { Prisma, AgentRunStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GovernanceRepository {
  constructor(private readonly prismaService: PrismaService) {}

  createExecutionMetric(data: Prisma.AgentExecutionMetricCreateInput) {
    return this.prismaService.agentExecutionMetric.create({ data });
  }

  createPolicyViolation(data: Prisma.AgentPolicyViolationCreateInput) {
    return this.prismaService.agentPolicyViolation.create({ data });
  }

  createOperationalImpact(data: Prisma.AgentOperationalImpactCreateInput) {
    return this.prismaService.agentOperationalImpact.create({ data });
  }

  findRunTrace(agentRunId: string) {
    return this.prismaService.agentRun.findUnique({
      where: { id: agentRunId },
      select: {
        id: true,
        organizationId: true,
        status: true,
        summary: true,
        observations: { orderBy: [{ createdAt: 'asc' }] },
        decisions: { orderBy: [{ createdAt: 'asc' }] },
        actionProposals: { orderBy: [{ createdAt: 'asc' }] },
        verificationResults: { orderBy: [{ createdAt: 'asc' }] },
        policyViolations: { orderBy: [{ detectedAt: 'asc' }] },
        executionMetrics: { orderBy: [{ measuredAt: 'asc' }] },
        operationalImpacts: { orderBy: [{ createdAt: 'asc' }] },
        inferenceAuditLogs: { orderBy: [{ createdAt: 'asc' }] },
      },
    });
  }

  async aggregateRunMetrics(organizationId: string, windowStart: Date) {
    const [runs, succeeded, failed, latencyMetrics, confidenceMetrics] = await Promise.all([
      this.prismaService.agentRun.count({
        where: { organizationId, createdAt: { gte: windowStart } },
      }),
      this.prismaService.agentRun.count({
        where: {
          organizationId,
          createdAt: { gte: windowStart },
          status: { in: [AgentRunStatus.SUCCEEDED, AgentRunStatus.VERIFIED_SUCCESS, AgentRunStatus.VERIFIED_PARTIAL] },
        },
      }),
      this.prismaService.agentRun.count({
        where: {
          organizationId,
          createdAt: { gte: windowStart },
          status: { in: [AgentRunStatus.FAILED, AgentRunStatus.VERIFIED_FAILED, AgentRunStatus.ESCALATED] },
        },
      }),
      this.prismaService.agentExecutionMetric.aggregate({
        where: {
          organizationId,
          measuredAt: { gte: windowStart },
          metricType: 'REASONING_LATENCY_MS',
        },
        _avg: { metricValue: true },
      }),
      this.prismaService.agentExecutionMetric.aggregate({
        where: {
          organizationId,
          measuredAt: { gte: windowStart },
          metricType: 'DECISION_CONFIDENCE',
        },
        _avg: { metricValue: true },
      }),
    ]);

    return {
      runs,
      succeeded,
      failed,
      averageReasoningLatencyMs: latencyMetrics._avg.metricValue ?? null,
      averageDecisionConfidence: confidenceMetrics._avg.metricValue ?? null,
    };
  }

  countRecentPolicyViolations(organizationId: string, windowStart: Date) {
    return this.prismaService.agentPolicyViolation.count({
      where: {
        organizationId,
        detectedAt: { gte: windowStart },
      },
    });
  }
}
