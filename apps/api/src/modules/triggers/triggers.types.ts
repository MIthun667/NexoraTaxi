import {
  TriggerActionType,
  TriggerExecutionStatus,
  TriggerRule,
} from '@prisma/client';

import { DomainEventEnvelope, DomainEventPayload } from '../events/domain-events.types';

export interface TriggerConditionConfig {
  all?: TriggerConditionConfig[];
  any?: TriggerConditionConfig[];
  field?: string;
  equals?: unknown;
  notEquals?: unknown;
  in?: unknown[];
  exists?: boolean;
  gte?: number;
  lte?: number;
  contains?: string;
}

export interface TriggerEvaluationContext<TPayload = DomainEventPayload> {
  event: DomainEventEnvelope<TPayload>;
  rule: TriggerRule;
  organizationId?: string | null;
}

export interface TriggerConditionResult {
  matched: boolean;
  reason?: string;
  dedupeKey?: string | null;
  cooldownActive?: boolean;
}

export interface TriggerActionRequest<TPayload = DomainEventPayload> {
  rule: TriggerRule;
  event: DomainEventEnvelope<TPayload>;
  dedupeKey?: string | null;
}

export interface TriggerActionResult {
  actionType: TriggerActionType;
  status: TriggerExecutionStatus;
  resultSummary: string;
  workflowInstanceId?: string | null;
  approvalRequestId?: string | null;
  agentRunId?: string | null;
  notificationId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TriggerExecutionOutcome {
  ruleId: string;
  domainEventId: string;
  executionStatus: TriggerExecutionStatus;
  resultSummary?: string | null;
  dedupeKey?: string | null;
  errorMessage?: string | null;
}
