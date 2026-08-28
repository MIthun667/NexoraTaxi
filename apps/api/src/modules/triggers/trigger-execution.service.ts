import { Prisma, TriggerExecutionStatus, TriggerRule } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { AuditService } from '../audit/audit.service';
import { DomainEventEnvelope } from '../events/domain-events.types';
import { DomainEventsService } from '../notifications/domain-events.service';
import { TriggerEvents } from './events/triggers.events';
import { TriggerActionsService } from './trigger-actions.service';
import { TriggerEvaluatorService } from './trigger-evaluator.service';
import { TriggerRepository } from './trigger.repository';
import { TriggerExecutionOutcome } from './triggers.types';

@Injectable()
export class TriggerExecutionService {
  constructor(
    private readonly triggerRepository: TriggerRepository,
    private readonly triggerEvaluatorService: TriggerEvaluatorService,
    private readonly triggerActionsService: TriggerActionsService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async execute(rule: TriggerRule, event: DomainEventEnvelope): Promise<TriggerExecutionOutcome> {
    const evaluation = await this.triggerEvaluatorService.evaluate(rule, event);

    if (!evaluation.matched) {
      return {
        ruleId: rule.id,
        domainEventId: event.id,
        executionStatus: TriggerExecutionStatus.SKIPPED,
        resultSummary: evaluation.reason ?? 'Trigger rule did not match.',
        dedupeKey: evaluation.dedupeKey,
      };
    }

    const initialStatus = evaluation.cooldownActive
      ? TriggerExecutionStatus.COOLDOWN_BLOCKED
      : TriggerExecutionStatus.PENDING;

    const executionLog = await this.triggerRepository.createExecutionLog({
      triggerRuleId: rule.id,
      domainEventId: event.id,
      organizationId: event.organizationId ?? null,
      executionStatus: initialStatus,
      resultSummary: evaluation.reason ?? null,
      dedupeKey: evaluation.dedupeKey ?? null,
      metadata: {
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId ?? null,
      } as Prisma.InputJsonValue,
    });

    if (evaluation.cooldownActive) {
      await this.auditService.record({
        action: 'trigger.cooldown.blocked',
        entityType: 'trigger-rule',
        entityId: rule.id,
        organizationId: event.organizationId ?? null,
        actorUserId: event.actorType === 'USER' ? event.actorId ?? null : null,
        summary: `Trigger rule ${rule.name} skipped because cooldown is active.`,
      });

      await this.domainEventsService.publish({
        organizationId: event.organizationId ?? null,
        eventType: TriggerEvents.executionSkipped,
        aggregateType: 'trigger-rule',
        aggregateId: rule.id,
        sourceModule: 'triggers',
        payload: {
          triggerRuleId: rule.id,
          domainEventId: event.id,
          executionStatus: TriggerExecutionStatus.COOLDOWN_BLOCKED,
          resultSummary: evaluation.reason ?? 'Cooldown active.',
        },
        correlationId: event.correlationId ?? event.id,
        causationId: event.id,
      });

      return {
        ruleId: rule.id,
        domainEventId: event.id,
        executionStatus: TriggerExecutionStatus.COOLDOWN_BLOCKED,
        resultSummary: evaluation.reason ?? 'Cooldown active.',
        dedupeKey: evaluation.dedupeKey,
      };
    }

    await this.triggerRepository.updateExecutionLog(executionLog.id, {
      executionStatus: TriggerExecutionStatus.RUNNING,
    });

    try {
      const result = await this.triggerActionsService.dispatch({
        rule,
        event,
        dedupeKey: evaluation.dedupeKey,
      });

      await this.triggerRepository.updateExecutionLog(executionLog.id, {
        executionStatus: result.status,
        resultSummary: result.resultSummary,
        workflowInstanceId: result.workflowInstanceId ?? null,
        approvalRequestId: result.approvalRequestId ?? null,
        agentRunId: result.agentRunId ?? null,
        notificationId: result.notificationId ?? null,
        finishedAt: new Date(),
        metadata:
          (result.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      });

      await this.auditService.record({
        action: 'trigger.execute',
        entityType: 'trigger-rule',
        entityId: rule.id,
        organizationId: event.organizationId ?? null,
        actorUserId: event.actorType === 'USER' ? event.actorId ?? null : null,
        summary: `Trigger rule ${rule.name} executed for ${event.eventType}.`,
        metadata: {
          domainEventId: event.id,
          executionStatus: result.status,
          dedupeKey: evaluation.dedupeKey ?? null,
        } as Prisma.InputJsonValue,
      });

      await this.domainEventsService.publish({
        organizationId: event.organizationId ?? null,
        eventType: TriggerEvents.executionSucceeded,
        aggregateType: 'trigger-rule',
        aggregateId: rule.id,
        sourceModule: 'triggers',
        payload: {
          triggerRuleId: rule.id,
          organizationId: event.organizationId ?? null,
          domainEventId: event.id,
          executionStatus: result.status,
          resultSummary: result.resultSummary,
        },
        correlationId: event.correlationId ?? event.id,
        causationId: event.id,
      });

      return {
        ruleId: rule.id,
        domainEventId: event.id,
        executionStatus: result.status,
        resultSummary: result.resultSummary,
        dedupeKey: evaluation.dedupeKey,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown trigger execution failure';

      await this.triggerRepository.updateExecutionLog(executionLog.id, {
        executionStatus: TriggerExecutionStatus.FAILED,
        errorMessage,
        finishedAt: new Date(),
      });

      await this.auditService.record({
        action: 'trigger.execute.fail',
        entityType: 'trigger-rule',
        entityId: rule.id,
        organizationId: event.organizationId ?? null,
        actorUserId: event.actorType === 'USER' ? event.actorId ?? null : null,
        summary: `Trigger rule ${rule.name} failed for ${event.eventType}.`,
        metadata: {
          domainEventId: event.id,
          reason: errorMessage,
        } as Prisma.InputJsonValue,
      });

      await this.domainEventsService.publish({
        organizationId: event.organizationId ?? null,
        eventType: TriggerEvents.executionFailed,
        aggregateType: 'trigger-rule',
        aggregateId: rule.id,
        sourceModule: 'triggers',
        payload: {
          triggerRuleId: rule.id,
          organizationId: event.organizationId ?? null,
          domainEventId: event.id,
          executionStatus: TriggerExecutionStatus.FAILED,
          errorMessage,
        },
        correlationId: event.correlationId ?? event.id,
        causationId: event.id,
      });

      this.logger.warn({
        event: 'trigger.execution_failed',
        triggerRuleId: rule.id,
        domainEventId: event.id,
        reason: errorMessage,
      });

      return {
        ruleId: rule.id,
        domainEventId: event.id,
        executionStatus: TriggerExecutionStatus.FAILED,
        errorMessage,
        dedupeKey: evaluation.dedupeKey,
      };
    }
  }
}
