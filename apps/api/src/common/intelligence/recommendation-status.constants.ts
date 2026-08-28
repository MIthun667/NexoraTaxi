export const RecommendationStatus = {
  proposed: 'PROPOSED',
  acknowledged: 'ACKNOWLEDGED',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  implemented: 'IMPLEMENTED',
  informational: 'INFORMATIONAL',
} as const;

export type RecommendationStatusValue =
  (typeof RecommendationStatus)[keyof typeof RecommendationStatus];
