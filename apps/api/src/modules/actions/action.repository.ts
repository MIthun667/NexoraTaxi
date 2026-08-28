import { Injectable } from '@nestjs/common';
import { AgentRunStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActionRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findProposalById(id: string) {
    return this.prismaService.agentActionProposal.findUnique({
      where: { id },
      select: {
        id: true,
        agentRunId: true,
        actionType: true,
        targetEntityType: true,
        targetEntityId: true,
        status: true,
        summary: true,
        payload: true,
        riskLevel: true,
        requiresApproval: true,
        createdAt: true,
        agentRun: {
          select: {
            id: true,
            organizationId: true,
            triggeredByUserId: true,
            agentDefinition: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  createExecutionLog(data: Prisma.ActionExecutionLogCreateInput) {
    return this.prismaService.actionExecutionLog.create({ data });
  }

  updateExecutionLog(id: string, data: Prisma.ActionExecutionLogUpdateInput) {
    return this.prismaService.actionExecutionLog.update({ where: { id }, data });
  }

  findExecutionByIdempotencyKey(idempotencyKey: string) {
    return this.prismaService.actionExecutionLog.findUnique({
      where: { idempotencyKey },
    });
  }

  updateProposalStatus(id: string, status: Prisma.EnumAgentActionProposalStatusFieldUpdateOperationsInput | string) {
    return this.prismaService.agentActionProposal.update({
      where: { id },
      data: {
        status: status as never,
      },
    });
  }

  updateRunStatus(id: string, status: AgentRunStatus, summary?: string | null) {
    return this.prismaService.agentRun.update({
      where: { id },
      data: {
        status,
        ...(summary !== undefined ? { summary } : {}),
      },
    });
  }
}
