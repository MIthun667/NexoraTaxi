export const RecommendationPriority = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
} as const;

export type RecommendationPriorityValue =
  (typeof RecommendationPriority)[keyof typeof RecommendationPriority];
