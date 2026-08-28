import { AgentRiskLevel, DecisionReportType } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { DecisionReportContext, ReportGenerationResult, ReportTemplate } from '../reports.types';

@Injectable()
export class IncidentEscalationTemplate implements ReportTemplate {
  readonly type = DecisionReportType.INCIDENT_ESCALATION;

  supports(context: DecisionReportContext): boolean {
    return context.agentRun.entityType === 'operational-incident';
  }

  build(context: DecisionReportContext): ReportGenerationResult {
    return {
      reportType: this.type,
      title: 'Incident Escalation Report',
      summary: context.primaryDecision?.summary ?? 'Incident escalation risk analysis generated.',
      findings: context.evidence.decisions,
      evidence: context.evidence,
      riskLevel: AgentRiskLevel.HIGH,
      recommendations: context.evidence.proposals,
      confidenceScore: context.primaryDecision?.confidence === 'HIGH' ? 0.92 : 0.7,
      supportingData: {
        incidentId: context.agentRun.entityId,
        relatedVerifications: context.evidence.verificationResults,
      },
    };
  }
}
