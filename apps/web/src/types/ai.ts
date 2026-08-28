export interface AiOverviewData {
  activity: {
    agentRunsToday: number;
    actionsExecuted: number;
    approvalsRequired: number;
    verificationSuccessRate: number;
  };
  impact: {
    incidentsResolved: number;
    scheduleCoverageImprovement: number;
    assetReadinessImprovement: number;
  };
  health: {
    activeAgents: number;
    failedRuns: number;
    averageLatencyMs: number;
  };
  recentDecisions: AgentDecisionListItem[];
}

export interface AgentDecisionListItem {
  id: string;
  runId: string;
  agentName: string;
  summary: string;
  confidence: string;
  createdAt: string;
}

export interface AgentRunListItem {
  id: string;
  agentName: string;
  agentCode: string;
  triggerType: string;
  triggerSource: string | null;
  triggerReason?: string | null;
  targetEntityType: string | null;
  targetEntityId: string | null;
  status: string;
  summary: string | null;
  startedAt: string;
  finishedAt: string | null;
  confidence: string | null;
  actionsProposed: number;
  organizationId?: string | null;
}

export interface AgentRunTraceItem {
  id: string;
  title: string;
  description?: string | null;
  timestamp: string;
  kind: 'observation' | 'decision' | 'proposal' | 'verification' | 'policy' | 'inference';
  status?: string | null;
}

export interface RetrievalBundleView {
  entitySnapshot: Record<string, unknown> | null;
  relatedEntities: Array<Record<string, unknown>>;
  timelineEvents: Array<Record<string, unknown>>;
  operationalMetrics: Array<Record<string, unknown>>;
  riskSignals: Array<Record<string, unknown>>;
  contextNotes: string[];
}

export interface VerificationResultView {
  id: string;
  verificationType: string;
  verificationStatus: string;
  summary: string;
  details?: unknown;
  createdAt: string;
}

export interface AgentProposalItem {
  id: string;
  runId: string;
  agentName: string;
  agentCode?: string | null;
  organizationId?: string | null;
  actionType: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  status: string;
  summary: string;
  riskLevel: string;
  requiresApproval: boolean;
  confidence: string | null;
  executionStatus?: string | null;
  approvalRequestId?: string | null;
  executionSummary?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunDetail {
  id: string;
  agentName: string;
  agentCode: string;
  organizationId: string | null;
  status: string;
  triggerSource: string | null;
  triggerReason?: string | null;
  triggerType: string;
  summary: string | null;
  entityType: string | null;
  entityId: string | null;
  startedAt: string;
  completedAt: string | null;
  inputContext: Record<string, unknown> | null;
  retrievalBundle: RetrievalBundleView | null;
  decisions: Array<{
    id: string;
    decisionType: string;
    summary: string;
    confidence: string;
    metadata?: unknown;
    createdAt: string;
  }>;
  observations: Array<{
    id: string;
    observationType: string;
    summary: string;
    metadata?: unknown;
    createdAt: string;
  }>;
  actionProposals: AgentProposalItem[];
  verificationResults: VerificationResultView[];
  trace: AgentRunTraceItem[];
}

export interface PolicyViolationItem {
  id: string;
  agentRunId: string;
  agentName: string;
  violationType: string;
  severity: string;
  description: string;
  detectedAt: string;
  policyRuleId?: string | null;
}

export interface AiMetricsSeriesPoint {
  label: string;
  count: number;
}

export interface AiMetricsData {
  successRate: number;
  approvalAcceptanceRate: number;
  averageExecutionLatencyMs: number;
  policyViolationRate: number;
  successTrend: AiMetricsSeriesPoint[];
  approvalTrend: AiMetricsSeriesPoint[];
  latencyTrend: AiMetricsSeriesPoint[];
  violationTrend: AiMetricsSeriesPoint[];
}

export interface ObservabilityRecord {
  id: string;
  runId: string;
  agentName: string;
  promptAudit: string;
  reasoningSummary: string;
  retrievalSummary: string;
  traceStatus: string;
  createdAt: string;
}

export interface ActionOutcomeView {
  id: string;
  executionId: string;
  proposalId?: string | null;
  recommendationId?: string | null;
  outcomeType: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'UNKNOWN' | string;
  outcomeScore: number;
  impactMetrics?: Record<string, unknown> | null;
  notes?: string | null;
  recordedAt: string;
}

export interface ActionExecutionView {
  id: string;
  organizationId: string;
  type: string;
  status: string;
  approvalStatus: string;
  proposal?: {
    id: string;
    title: string;
    description: string;
  } | null;
  requestedByUser?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  approvedByUser?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  auditTrail?: Array<{
    id: string;
    action: string;
    createdAt: string;
  }>;
  outcome?: ActionOutcomeView | null;
  result?: unknown;
  error?: string | null;
  createdAt: string;
}

export interface LearningInsightsData {
  summary: {
    totalActionsTracked: number;
    positiveOutcomeRate: number;
    operatorApprovalRate: number;
  };
  recentOutcomes: ActionOutcomeView[];
  recentDecisions: Array<{
    id: string;
    proposalId: string;
    decision: string;
    decidedByUserId?: string | null;
    decidedAt: string;
    reason?: string | null;
    metadata?: unknown;
  }>;
}
