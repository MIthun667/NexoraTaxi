import { TriggerActionType, TriggerExecutionStatus } from '@prisma/client';

import { DomainEventPayload } from '../../events/domain-events.types';

export const TriggerEvents = {
  actionRequested: 'trigger.action.requested',
  executionSucceeded: 'trigger.execution.succeeded',
  executionFailed: 'trigger.execution.failed',
  executionSkipped: 'trigger.execution.skipped',
} as const;

export interface TriggerActionRequestedEventPayload extends DomainEventPayload {
  triggerRuleId: string;
  organizationId?: string | null;
  sourceDomainEventId: string;
  sourceEventType: string;
  actionType: TriggerActionType;
  actionTarget?: string | null;
}

export interface TriggerExecutionEventPayload extends DomainEventPayload {
  triggerRuleId: string;
  organizationId?: string | null;
  domainEventId: string;
  executionStatus: TriggerExecutionStatus;
  resultSummary?: string | null;
  errorMessage?: string | null;
}
