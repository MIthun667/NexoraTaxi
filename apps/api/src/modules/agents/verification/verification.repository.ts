import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class VerificationRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findAgentRunById(id: string) {
    return this.prismaService.agentRun.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        status: true,
        entityType: true,
        entityId: true,
        summary: true,
        actionProposals: {
          select: {
            id: true,
            actionType: true,
            targetEntityType: true,
            targetEntityId: true,
            status: true,
            summary: true,
            riskLevel: true,
            requiresApproval: true,
          },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });
  }

  createVerificationResult(data: Prisma.AgentVerificationResultCreateInput) {
    return this.prismaService.agentVerificationResult.create({ data });
  }

  createFeedback(data: Prisma.AgentFeedbackCreateInput) {
    return this.prismaService.agentFeedback.create({ data });
  }

  createEvaluationResult(data: Prisma.AgentEvaluationResultCreateInput) {
    return this.prismaService.agentEvaluationResult.create({ data });
  }

  updateRunStatus(id: string, status: Prisma.AgentRunUpdateInput['status'], summary?: string | null) {
    return this.prismaService.agentRun.update({
      where: { id },
      data: {
        status,
        ...(summary !== undefined ? { summary } : {}),
      },
    });
  }

  findExecutionLogById(id: string) {
    return this.prismaService.actionExecutionLog.findUnique({
      where: { id },
    });
  }

  findVerificationResultsForRun(agentRunId: string) {
    return this.prismaService.agentVerificationResult.findMany({
      where: { agentRunId },
      orderBy: [{ createdAt: 'asc' }],
    });
  }
}
