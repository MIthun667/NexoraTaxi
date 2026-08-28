import { DecisionReportType } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { ReportRiskAnalysisService } from '../report-risk-analysis.service';
import { DecisionReportContext, ReportGenerationResult, ReportTemplate } from '../reports.types';

@Injectable()
export class ExecutiveSummaryTemplate implements ReportTemplate {
  readonly type = DecisionReportType.EXECUTIVE_SUMMARY;

  constructor(private readonly reportRiskAnalysisService: ReportRiskAnalysisService) {}

  supports(context: DecisionReportContext): boolean {
    return context.agentRun.agentDefinition.code.toLowerCase().includes('executive') || context.agentRun.agentDefinition.category.toLowerCase().includes('executive');
  }

  build(context: DecisionReportContext): ReportGenerationResult {
    const riskLevel = this.reportRiskAnalysisService.resolveRiskLevel(context.evidence);
    return {
      reportType: this.type,
      title: 'Executive Decision Summary',
      summary: context.primaryDecision?.summary ?? context.agentRun.summary ?? 'Executive briefing generated.',
      findings: this.reportRiskAnalysisService.extractFindings(context.evidence),
      evidence: {
        decisions: context.evidence.decisions,
        skillResults: context.evidence.skillResults,
        verificationResults: context.evidence.verificationResults,
      },
      riskLevel,
      recommendations: context.evidence.proposals,
      confidenceScore: context.primaryDecision?.confidence === 'HIGH' ? 0.95 : context.primaryDecision?.confidence === 'MEDIUM' ? 0.75 : 0.5,
      supportingData: {
        contextNotes: context.evidence.observations.slice(0, 5),
      },
    };
  }
}
