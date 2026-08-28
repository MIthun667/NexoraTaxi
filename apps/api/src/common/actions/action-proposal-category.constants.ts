export const ActionProposalCategory = {
  people: 'people',
  assets: 'assets',
  operations: 'operations',
  workflows: 'workflows',
  approvals: 'approvals',
  compliance: 'compliance',
  notifications: 'notifications',
  system: 'system',
} as const;

export type ActionProposalCategoryValue =
  (typeof ActionProposalCategory)[keyof typeof ActionProposalCategory];
