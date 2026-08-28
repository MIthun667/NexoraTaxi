export const RETRIEVAL_DEFAULT_MAX_RECORDS = 25;
export const RETRIEVAL_HARD_MAX_RECORDS = 100;
export const RETRIEVAL_DEFAULT_TIME_WINDOW_DAYS = 30;
export const RETRIEVAL_DEFAULT_TIMEOUT_MS = 1500;
export const RETRIEVAL_PROVIDER_TIMEOUT_MS = 500;

export const UNIVERSAL_RETRIEVAL_ENTITY_TYPES = [
  'workforce-member',
  'asset',
  'work-order',
  'operational-zone',
  'schedule-plan',
  'schedule-shift',
  'operational-incident',
  'resource-assignment',
] as const;
