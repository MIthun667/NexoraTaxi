import { Injectable } from '@nestjs/common';

import { ExecutiveSummaryTemplate } from './templates/executive-summary.template';
import { IncidentEscalationTemplate } from './templates/incident-escalation.template';
import { OperationalRiskTemplate } from './templates/operational-risk.template';
import { DecisionReportContext, ReportGenerationResult, ReportTemplate } from './reports.types';

@Injectable()
export class ReportBuilderService {
  private readonly templates: ReportTemplate[];

  constructor(
    operationalRiskTemplate: OperationalRiskTemplate,
    incidentEscalationTemplate: IncidentEscalationTemplate,
    executiveSummaryTemplate: ExecutiveSummaryTemplate,
  ) {
    this.templates = [
      executiveSummaryTemplate,
      incidentEscalationTemplate,
      operationalRiskTemplate,
    ];
  }

  build(context: DecisionReportContext): ReportGenerationResult {
    const template = this.templates.find((entry) => entry.supports(context)) ?? this.templates[this.templates.length - 1];
    return template.build(context);
  }
}
