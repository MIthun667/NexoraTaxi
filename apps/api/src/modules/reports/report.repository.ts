import { DecisionReportType, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { QueryDecisionReportsDto } from './dto/query-decision-reports.dto';

@Injectable()
export class ReportRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findAgentRunWithEvidence(agentRunId: string) {
    return this.prismaService.agentRun.findUnique({
      where: { id: agentRunId },
      include: {
        agentDefinition: true,
        observations: { orderBy: { createdAt: 'asc' } },
        decisions: { orderBy: { createdAt: 'asc' } },
        actionProposals: { orderBy: { createdAt: 'asc' } },
        verificationResults: { orderBy: { createdAt: 'asc' } },
        inferenceAuditLogs: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async createReport(data: Prisma.DecisionReportUncheckedCreateInput) {
    return this.prismaService.decisionReport.create({ data });
  }

  async findById(id: string) {
    return this.prismaService.decisionReport.findUnique({ where: { id } });
  }

  async findByAgentRunId(agentRunId: string) {
    return this.prismaService.decisionReport.findMany({
      where: { agentRunId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findExecutiveSummary(organizationId?: string) {
    return this.prismaService.decisionReport.findFirst({
      where: {
        ...(organizationId ? { organizationId } : {}),
        reportType: DecisionReportType.EXECUTIVE_SUMMARY,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async query(query: QueryDecisionReportsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.DecisionReportWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.agentRunId ? { agentRunId: query.agentRunId } : {}),
      ...(query.reportType ? { reportType: query.reportType } : {}),
    };

    const [data, total] = await Promise.all([
      this.prismaService.decisionReport.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prismaService.decisionReport.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
