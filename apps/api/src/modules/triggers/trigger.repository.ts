import { Injectable } from '@nestjs/common';
import { Prisma, TriggerExecutionStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TriggerRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findCandidateRules(organizationId: string | null | undefined, eventType: string, aggregateType?: string | null) {
    return this.prismaService.triggerRule.findMany({
      where: {
        eventType,
        isEnabled: true,
        OR: [
          { organizationId: organizationId ?? undefined },
          { organizationId: null },
        ],
        ...(aggregateType ? { OR: [{ aggregateType }, { aggregateType: null }] } : {}),
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  createExecutionLog(data: Prisma.TriggerExecutionLogCreateInput) {
    return this.prismaService.triggerExecutionLog.create({ data });
  }

  updateExecutionLog(id: string, data: Prisma.TriggerExecutionLogUpdateInput) {
    return this.prismaService.triggerExecutionLog.update({
      where: { id },
      data,
    });
  }

  findRecentExecutionByDedupeKey(params: {
    triggerRuleId: string;
    organizationId?: string | null;
    dedupeKey: string;
    startedAfter: Date;
  }) {
    return this.prismaService.triggerExecutionLog.findFirst({
      where: {
        triggerRuleId: params.triggerRuleId,
        organizationId: params.organizationId ?? null,
        dedupeKey: params.dedupeKey,
        startedAt: { gte: params.startedAfter },
        executionStatus: {
          in: [
            TriggerExecutionStatus.PENDING,
            TriggerExecutionStatus.RUNNING,
            TriggerExecutionStatus.SUCCEEDED,
          ],
        },
      },
      orderBy: [{ startedAt: 'desc' }],
    });
  }
}
