export const AgentMetricTypes = {
  runStarted: 'RUN_STARTED',
  runCompleted: 'RUN_COMPLETED',
  runFailed: 'RUN_FAILED',
  reasoningLatencyMs: 'REASONING_LATENCY_MS',
  decisionConfidence: 'DECISION_CONFIDENCE',
  actionProposalCount: 'ACTION_PROPOSAL_COUNT',
  actionsExecuted: 'ACTIONS_EXECUTED',
  actionsBlocked: 'ACTIONS_BLOCKED',
  approvalRequired: 'APPROVAL_REQUIRED',
  verificationPassRate: 'VERIFICATION_PASS_RATE',
} as const;

export const AgentImpactTypes = {
  incidentResolutionSpeed: 'INCIDENT_RESOLUTION_SPEED',
  scheduleCoverageImprovement: 'SCHEDULE_COVERAGE_IMPROVEMENT',
  assetReadinessImprovement: 'ASSET_READINESS_IMPROVEMENT',
  workforceCoverageImprovement: 'WORKFORCE_COVERAGE_IMPROVEMENT',
} as const;

export const GovernanceDefaults = {
  healthWindowHours: 24,
  metricsWindowDays: 7,
} as const;
