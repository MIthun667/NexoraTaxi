import { AgentRiskLevel, DecisionReportType } from '@prisma/client';

export interface DecisionReportPresenter {
  id: string;
  organizationId: string | null;
  agentRunId: string;
  agentDecisionId: string | null;
  reportType: DecisionReportType;
  title: string;
  summary: string;
  findings: unknown;
  evidence: unknown;
  riskLevel: AgentRiskLevel;
  recommendations: unknown;
  confidenceScore: number;
  supportingData: unknown;
  createdAt: Date;
  updatedAt: Date;
}
