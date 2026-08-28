import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { ReportBuilderService } from './report-builder.service';
import { ReportEvidenceService } from './report-evidence.service';
import { ReportGeneratorService } from './report-generator.service';
import { ReportRepository } from './report.repository';
import { ReportRiskAnalysisService } from './report-risk-analysis.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ExecutiveSummaryTemplate } from './templates/executive-summary.template';
import { IncidentEscalationTemplate } from './templates/incident-escalation.template';
import { OperationalRiskTemplate } from './templates/operational-risk.template';

@Module({
  imports: [AuditModule, NotificationsModule, TenancyModule],
  controllers: [ReportsController],
  providers: [
    ReportRepository,
    ReportEvidenceService,
    ReportRiskAnalysisService,
    OperationalRiskTemplate,
    IncidentEscalationTemplate,
    ExecutiveSummaryTemplate,
    ReportBuilderService,
    ReportGeneratorService,
    ReportsService,
  ],
  exports: [ReportGeneratorService, ReportsService],
})
export class ReportsModule {}
