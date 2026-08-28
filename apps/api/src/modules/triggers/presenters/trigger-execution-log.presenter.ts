import { TriggerExecutionStatus } from '@prisma/client';

export interface TriggerExecutionLogPresenter {
  id: string;
  triggerRuleId: string;
  domainEventId: string;
  organizationId?: string | null;
  executionStatus: TriggerExecutionStatus;
  resultSummary?: string | null;
  workflowInstanceId?: string | null;
  approvalRequestId?: string | null;
  agentRunId?: string | null;
  notificationId?: string | null;
  dedupeKey?: string | null;
  startedAt: Date;
  finishedAt?: Date | null;
  errorMessage?: string | null;
}
