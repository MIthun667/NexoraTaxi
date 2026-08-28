import { TriggerExecutionLog, TriggerRule } from '@prisma/client';

import { TriggerExecutionLogPresenter } from '../presenters/trigger-execution-log.presenter';
import { TriggerRulePresenter } from '../presenters/trigger-rule.presenter';

export function toTriggerRulePresenter(rule: TriggerRule): TriggerRulePresenter {
  return {
    id: rule.id,
    organizationId: rule.organizationId,
    name: rule.name,
    description: rule.description,
    eventType: rule.eventType,
    aggregateType: rule.aggregateType,
    actionType: rule.actionType,
    actionTarget: rule.actionTarget,
    priority: rule.priority,
    isEnabled: rule.isEnabled,
    cooldownSeconds: rule.cooldownSeconds,
    dedupeKeyStrategy: rule.dedupeKeyStrategy,
    createdByUserId: rule.createdByUserId,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

export function toTriggerExecutionLogPresenter(
  log: TriggerExecutionLog,
): TriggerExecutionLogPresenter {
  return {
    id: log.id,
    triggerRuleId: log.triggerRuleId,
    domainEventId: log.domainEventId,
    organizationId: log.organizationId,
    executionStatus: log.executionStatus,
    resultSummary: log.resultSummary,
    workflowInstanceId: log.workflowInstanceId,
    approvalRequestId: log.approvalRequestId,
    agentRunId: log.agentRunId,
    notificationId: log.notificationId,
    dedupeKey: log.dedupeKey,
    startedAt: log.startedAt,
    finishedAt: log.finishedAt,
    errorMessage: log.errorMessage,
  };
}
