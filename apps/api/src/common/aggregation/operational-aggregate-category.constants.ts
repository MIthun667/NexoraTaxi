export const OPERATIONAL_AGGREGATE_CATEGORIES = [
  'people',
  'assets',
  'operations',
  'workflows',
  'approvals',
  'system',
] as const;

export type OperationalAggregateCategory =
  (typeof OPERATIONAL_AGGREGATE_CATEGORIES)[number];
