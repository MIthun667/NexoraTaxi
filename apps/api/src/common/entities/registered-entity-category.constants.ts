export const REGISTERED_ENTITY_CATEGORIES = [
  'people',
  'assets',
  'operations',
  'workflows',
  'approvals',
  'system',
] as const;

export type RegisteredEntityCategory =
  (typeof REGISTERED_ENTITY_CATEGORIES)[number];
