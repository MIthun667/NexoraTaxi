export const PlatformEventCategory = {
  people: 'people',
  assets: 'assets',
  operations: 'operations',
  workflows: 'workflows',
  approvals: 'approvals',
  notifications: 'notifications',
  intelligence: 'intelligence',
  system: 'system',
} as const;

export type PlatformEventCategoryValue =
  (typeof PlatformEventCategory)[keyof typeof PlatformEventCategory];
