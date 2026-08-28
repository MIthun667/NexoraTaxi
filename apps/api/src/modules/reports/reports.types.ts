import { AgentRiskLevel, DecisionReportType, Prisma } from '@prisma/client';

export interface ReportEvidenceBundle {
  observations: Array<Record<string, unknown>>;
  decisions: Array<Record<string, unknown>>;
  proposals: Array<Record<string, unknown>>;
  verificationResults: Array<Record<string, unknown>>;
  inferenceAudits: Array<Record<string, unknown>>;
  skillResults: Array<Record<string, unknown>>;
}

export interface DecisionReportContext {
  organizationId: string | null;
  agentRun: {
    id: string;
    entityType?: string | null;
    entityId?: string | null;
    summary?: string | null;
    status: string;
    agentDefinition: {
      id: string;
      code: string;
      name: string;
      category: string;
    };
  };
  primaryDecision: {
    id: string;
    summary: string;
    confidence: string;
    metadata?: Prisma.JsonValue | null;
  } | null;
  evidence: ReportEvidenceBundle;
}

export interface ReportGenerationResult {
  reportType: DecisionReportType;
  title: string;
  summary: string;
  findings: unknown;
  evidence: unknown;
  riskLevel: AgentRiskLevel;
  recommendations: unknown;
  confidenceScore: number;
  supportingData?: unknown;
}

export interface ReportTemplate {
  readonly type: DecisionReportType;
  supports(context: DecisionReportContext): boolean;
  build(context: DecisionReportContext): ReportGenerationResult;
}
