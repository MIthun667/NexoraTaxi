import {
  NotificationCategory,
  NotificationSeverity,
  Prisma,
} from '@prisma/client';

import {
  DomainActorType,
  DomainEventProcessingStatus,
} from './domain-events.constants';

export type DomainEventProcessingStatusValue =
  (typeof DomainEventProcessingStatus)[keyof typeof DomainEventProcessingStatus];

export type DomainActorTypeValue =
  (typeof DomainActorType)[keyof typeof DomainActorType];

export interface NotificationEnvelope {
  category: NotificationCategory;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface DomainEventRecipients {
  userIds?: string[];
  roleCodes?: string[];
  permissionCodes?: string[];
}

export interface DomainEventPayload {
  notification?: NotificationEnvelope;
  recipients?: DomainEventRecipients;
  [key: string]: unknown;
}

export interface DomainEventEnvelope<TPayload = DomainEventPayload> {
  id: string;
  organizationId?: string | null;
  eventType: string;
  aggregateType: string;
  aggregateId?: string | null;
  actorType?: DomainActorTypeValue | null;
  actorId?: string | null;
  sourceModule?: string | null;
  payload: TPayload;
  metadata?: Record<string, unknown> | null;
  occurredAt: Date;
  publishedAt?: Date | null;
  processingStatus?: DomainEventProcessingStatusValue;
  correlationId?: string | null;
  causationId?: string | null;
}

export interface DomainEventDispatchRecord<TPayload = DomainEventPayload>
  extends DomainEventEnvelope<TPayload> {}

export interface PublishDomainEventInput<TPayload = DomainEventPayload> {
  organizationId?: string | null;
  eventType: string;
  aggregateType: string;
  aggregateId?: string | null;
  actorType?: DomainActorTypeValue | null;
  actorId?: string | null;
  sourceModule?: string | null;
  payload?: TPayload;
  metadata?: Record<string, unknown> | null;
  triggeredByUserId?: string | null;
  occurredAt?: Date;
  correlationId?: string | null;
  causationId?: string | null;
}

export interface DomainEventDispatchResult {
  success: boolean;
  retryable?: boolean;
  errorMessage?: string | null;
  handlerName: string;
  processedAt: Date;
}

export interface DomainEventHandler<TPayload = DomainEventPayload> {
  readonly name: string;
  canHandle(event: DomainEventEnvelope<TPayload>): boolean;
  handle(event: DomainEventEnvelope<TPayload>): Promise<DomainEventDispatchResult | void>;
}
