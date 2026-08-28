export const SignalCategory = {
  people: 'people',
  assets: 'assets',
  operations: 'operations',
  workflows: 'workflows',
  approvals: 'approvals',
  compliance: 'compliance',
  notifications: 'notifications',
  system: 'system',
} as const;

export type SignalCategoryValue =
  (typeof SignalCategory)[keyof typeof SignalCategory];
