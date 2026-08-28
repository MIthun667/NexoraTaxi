import { AgentRiskLevel, AgentRunStatus, Prisma } from '@prisma/client';

export interface AgentRunMetrics {
  runs: number;
  succeeded: number;
  failed: number;
  successRate: number;
  averageReasoningLatencyMs: number | null;
  averageDecisionConfidence: number | null;
}

export interface AgentDecisionTrace {
  runId: string;
  organizationId: string | null;
  status: AgentRunStatus;
  summary: string | null;
  observations: Array<Record<string, unknown>>;
  decisions: Array<Record<string, unknown>>;
  proposals: Array<Record<string, unknown>>;
  verificationResults: Array<Record<string, unknown>>;
  policyViolations: Array<Record<string, unknown>>;
  executionMetrics: Array<Record<string, unknown>>;
  operationalImpacts: Array<Record<string, unknown>>;
  inferenceAuditLogs: Array<Record<string, unknown>>;
}

export interface PolicyViolationRecord {
  organizationId?: string | null;
  agentRunId: string;
  policyRuleId?: string | null;
  violationType: string;
  severity: AgentRiskLevel;
  description: string;
  metadata?: Prisma.InputJsonValue;
}

export interface OperationalImpactMetric {
  organizationId?: string | null;
  agentRunId: string;
  impactType: string;
  baselineValue?: number | null;
  observedValue?: number | null;
  delta?: number | null;
  evaluationWindowStart: Date;
  evaluationWindowEnd: Date;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}

export interface AgentHealthStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  runsLast24h: number;
  failureRate: number;
  averageLatencyMs: number | null;
  openPolicyViolations: number;
}
