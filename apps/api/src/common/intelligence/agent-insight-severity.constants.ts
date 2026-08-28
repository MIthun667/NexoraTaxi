export const AgentInsightSeverity = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
} as const;

export type AgentInsightSeverityValue =
  (typeof AgentInsightSeverity)[keyof typeof AgentInsightSeverity];
