export const AgentInsightCategory = {
  people: 'people',
  assets: 'assets',
  operations: 'operations',
  workflows: 'workflows',
  approvals: 'approvals',
  compliance: 'compliance',
  executive: 'executive',
  system: 'system',
} as const;

export type AgentInsightCategoryValue =
  (typeof AgentInsightCategory)[keyof typeof AgentInsightCategory];
