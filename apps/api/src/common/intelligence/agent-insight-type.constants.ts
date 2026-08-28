export const AgentInsightType = {
  signalDerived: 'SIGNAL_DERIVED',
  summary: 'SUMMARY',
  findingBundle: 'FINDING_BUNDLE',
  recommendationBundle: 'RECOMMENDATION_BUNDLE',
  executiveBrief: 'EXECUTIVE_BRIEF',
} as const;

export type AgentInsightTypeValue =
  (typeof AgentInsightType)[keyof typeof AgentInsightType];
