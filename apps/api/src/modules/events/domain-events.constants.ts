export const DOMAIN_EVENT_BATCH_SIZE = 100;
export const DOMAIN_EVENT_MAX_RETRIES = 5;

export const DomainEventProcessingStatus = {
  PENDING: 'PENDING',
  PUBLISHED: 'PUBLISHED',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
  DEAD_LETTER: 'DEAD_LETTER',
} as const;

export const DomainActorType = {
  USER: 'USER',
  AGENT: 'AGENT',
  SYSTEM: 'SYSTEM',
  SERVICE: 'SERVICE',
} as const;
