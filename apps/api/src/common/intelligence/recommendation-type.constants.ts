export const RecommendationType = {
  operationalNextStep: 'OPERATIONAL_NEXT_STEP',
  riskMitigation: 'RISK_MITIGATION',
  escalation: 'ESCALATION',
  approvalDecisionSupport: 'APPROVAL_DECISION_SUPPORT',
  reviewAction: 'REVIEW_ACTION',
} as const;

export type RecommendationTypeValue =
  (typeof RecommendationType)[keyof typeof RecommendationType];
