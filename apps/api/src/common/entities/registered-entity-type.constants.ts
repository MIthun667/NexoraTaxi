export const REGISTERED_ENTITY_TYPES = [
  'person',
  'asset',
  'operational-task',
  'workflow-instance',
  'approval-request',
] as const;

export type RegisteredEntityType = (typeof REGISTERED_ENTITY_TYPES)[number];
