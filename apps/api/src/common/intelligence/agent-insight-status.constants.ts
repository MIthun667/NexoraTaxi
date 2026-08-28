export const AgentInsightStatus = {
  draft: 'DRAFT',
  active: 'ACTIVE',
  acknowledged: 'ACKNOWLEDGED',
  resolved: 'RESOLVED',
  informational: 'INFORMATIONAL',
} as const;

export type AgentInsightStatusValue =
  (typeof AgentInsightStatus)[keyof typeof AgentInsightStatus];
