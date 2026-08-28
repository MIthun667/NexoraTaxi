import { Injectable } from '@nestjs/common';
import {
  AgentRunStatus,
  AgentVerificationStatus,
  Prisma,
} from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { QueryAiOrganizationDto } from './dto/query-ai-organization.dto';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';

const VERIFIED_SUCCESS_STATUSES: AgentRunStatus[] = [
  'VERIFIED_SUCCESS',
  'VERIFIED_PARTIAL',
];

@Injectable()
export class AiOverviewService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
  ) {}

  async getOverview(principal: CurrentPrincipal, query: QueryAiOrganizationDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      agentRunsToday,
      approvalsRequired,
      actionsExecuted,
      verifiedRuns,
      activeAgents,
      failedRuns,
      recentCompletedRuns,
      recentDecisions,
    ] = await this.prismaService.$transaction([
      this.prismaService.agentRun.count({
        where: {
          organizationId,
          createdAt: { gte: startOfToday },
        },
      }),
      this.prismaService.agentActionProposal.count({
        where: {
          status: 'APPROVAL_REQUIRED',
          agentRun: {
            organizationId,
          },
        },
      }),
      this.prismaService.actionExecutionLog.count({
        where: {
          organizationId,
          executionStatus: 'SUCCEEDED',
          startedAt: { gte: startOfToday },
        },
      }),
      this.prismaService.agentRun.findMany({
        where: {
          organizationId,
          createdAt: { gte: startOfToday },
          status: { in: VERIFIED_SUCCESS_STATUSES },
        },
        select: {
          id: true,
          verificationResults: {
            select: {
              verificationStatus: true,
            },
          },
        },
      }),
      this.prismaService.agentDefinition.count({
        where: {
          isActive: true,
        },
      }),
      this.prismaService.agentRun.count({
        where: {
          organizationId,
          createdAt: { gte: startOfToday },
          status: { in: ['FAILED', 'VERIFIED_FAILED', 'CANCELLED'] },
        },
      }),
      this.prismaService.agentRun.findMany({
        where: {
          organizationId,
          createdAt: { gte: startOfToday },
          completedAt: { not: null },
        },
        select: {
          startedAt: true,
          completedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      }),
      this.prismaService.agentDecision.findMany({
        where: {
          agentRun: {
            organizationId,
          },
        },
        select: {
          id: true,
          agentRunId: true,
          summary: true,
          confidence: true,
          createdAt: true,
          agentRun: {
            select: {
              agentDefinition: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      }),
    ]);

    const verificationOutcomes = verifiedRuns.flatMap((run) =>
      run.verificationResults.map((result) => result.verificationStatus),
    );
    const passedVerifications = verificationOutcomes.filter(
      (status) => status === AgentVerificationStatus.PASSED,
    ).length;
    const verificationSuccessRate =
      verificationOutcomes.length > 0
        ? passedVerifications / verificationOutcomes.length
        : verifiedRuns.length > 0
          ? 1
          : 0;

    const averageLatencyMs = this.calculateAverageLatencyMs(recentCompletedRuns);

    return buildSuccessResponse('AI overview retrieved successfully.', {
      activity: {
        agentRunsToday,
        actionsExecuted,
        approvalsRequired,
        verificationSuccessRate,
      },
      impact: {
        incidentsResolved: 0,
        scheduleCoverageImprovement: 0,
        assetReadinessImprovement: 0,
      },
      health: {
        activeAgents,
        failedRuns,
        averageLatencyMs,
      },
      recentDecisions: recentDecisions.map((decision) => ({
        id: decision.id,
        runId: decision.agentRunId,
        agentName: decision.agentRun.agentDefinition.name,
        summary: decision.summary,
        confidence: decision.confidence,
        createdAt: decision.createdAt,
      })),
    });
  }

  private calculateAverageLatencyMs(
    runs: Array<{
      startedAt: Date;
      completedAt: Date | null;
    }>,
  ) {
    const durations = runs
      .filter((run) => run.completedAt instanceof Date)
      .map((run) => {
        const completedAt = run.completedAt as Date;
        return completedAt.getTime() - run.startedAt.getTime();
      })
      .filter((duration) => Number.isFinite(duration) && duration >= 0);

    if (durations.length === 0) {
      return 0;
    }

    return Math.round(
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length,
    );
  }
}
