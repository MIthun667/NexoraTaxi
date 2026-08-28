import { DecisionReportType } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { ReportRiskAnalysisService } from '../report-risk-analysis.service';
import { DecisionReportContext, ReportGenerationResult, ReportTemplate } from '../reports.types';

@Injectable()
export class OperationalRiskTemplate implements ReportTemplate {
  readonly type = DecisionReportType.OPERATIONAL_RISK;

  constructor(private readonly reportRiskAnalysisService: ReportRiskAnalysisService) {}

  supports(): boolean {
    return true;
  }

  build(context: DecisionReportContext): ReportGenerationResult {
    const riskLevel = this.reportRiskAnalysisService.resolveRiskLevel(context.evidence);
    const findings = this.reportRiskAnalysisService.extractFindings(context.evidence);

    return {
      reportType: this.type,
      title: `Operational Risk Report for ${context.agentRun.agentDefinition.name}`,
      summary: context.primaryDecision?.summary ?? context.agentRun.summary ?? 'Operational analysis completed.',
      findings,
      evidence: context.evidence,
      riskLevel,
      recommendations: context.evidence.proposals,
      confidenceScore: context.primaryDecision?.confidence === 'HIGH' ? 0.9 : context.primaryDecision?.confidence === 'MEDIUM' ? 0.65 : 0.4,
      supportingData: {
        entityType: context.agentRun.entityType,
        entityId: context.agentRun.entityId,
      },
    };
  }
}
