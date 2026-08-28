import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { UsageMeterService } from '../tenancy/usage-meter.service';
import { ReportBuilderService } from './report-builder.service';
import { ReportEvidenceService } from './report-evidence.service';
import { ReportRepository } from './report.repository';

@Injectable()
export class ReportGeneratorService {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly reportEvidenceService: ReportEvidenceService,
    private readonly reportBuilderService: ReportBuilderService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
    private readonly usageMeterService: UsageMeterService,
  ) {}

  async generateForAgentRun(agentRunId: string) {
    const run = await this.reportRepository.findAgentRunWithEvidence(agentRunId);
    if (!run) {
      throw new NotFoundException('Agent run not found for report generation.');
    }

    const evidence = this.reportEvidenceService.buildEvidence(run);
    const primaryDecision = run.decisions[0]
      ? {
          id: run.decisions[0].id,
          summary: run.decisions[0].summary,
          confidence: run.decisions[0].confidence,
          metadata: run.decisions[0].metadata,
        }
      : null;

    const built = this.reportBuilderService.build({
      organizationId: run.organizationId ?? null,
      agentRun: {
        id: run.id,
        entityType: run.entityType ?? null,
        entityId: run.entityId ?? null,
        summary: run.summary ?? null,
        status: run.status,
        agentDefinition: {
          id: run.agentDefinition.id,
          code: run.agentDefinition.code,
          name: run.agentDefinition.name,
          category: run.agentDefinition.category,
        },
      },
      primaryDecision,
      evidence,
    });

    const report = await this.reportRepository.createReport({
      organizationId: run.organizationId ?? null,
      agentRunId: run.id,
      agentDecisionId: primaryDecision?.id ?? null,
      reportType: built.reportType,
      title: built.title,
      summary: built.summary,
      findings: built.findings as Prisma.InputJsonValue,
      evidence: built.evidence as Prisma.InputJsonValue,
      riskLevel: built.riskLevel,
      recommendations: built.recommendations as Prisma.InputJsonValue,
      confidenceScore: built.confidenceScore,
      supportingData: (built.supportingData as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
    });

    await this.auditService.record({
      action: 'decision-report.generate',
      actorUserId: null,
      entityId: report.id,
      entityType: 'decision-report',
      organizationId: run.organizationId ?? null,
      summary: `Decision report generated for agent run ${run.id}.`,
      metadata: {
        reportType: report.reportType,
        agentRunId: run.id,
      } as Prisma.InputJsonValue,
    });

    await this.domainEventsService.publish({
      organizationId: run.organizationId ?? null,
      eventType: 'decision_report.generated',
      aggregateType: 'decision-report',
      aggregateId: report.id,
      payload: {
        reportId: report.id,
        reportType: report.reportType,
        agentRunId: run.id,
      },
    });

    if (run.organizationId) {
      await this.usageMeterService.recordUsage({
        organizationId: run.organizationId,
        metricType: 'REPORT_GENERATIONS',
        metricValue: 1,
        metadata: {
          reportId: report.id,
          reportType: report.reportType,
          agentRunId: run.id,
        },
      });
    }

    return report;
  }
}
