export const JOB_QUEUE_NAMES = {
  integration: 'integration',
  intelligence: 'intelligence',
  system: 'system',
  deadLetter: 'dead-letter',
} as const;

export type JobQueueName = (typeof JOB_QUEUE_NAMES)[keyof typeof JOB_QUEUE_NAMES];

export const JOB_NAMES = {
  shopifyInitialSync: 'shopify.initial_sync',
  shopifyFullSync: 'shopify.full_sync',
  shopifyIncrementalSync: 'shopify.incremental_sync',
  intelligenceRefresh: 'intelligence.refresh',
  dailyBriefGenerate: 'daily_brief.generate',
  notificationDispatch: 'notification.dispatch',
  reportGenerate: 'report.generate',
  deadLetterRecord: 'system.dead_letter.record',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export const JOB_ENVELOPE_VERSION = 1 as const;
