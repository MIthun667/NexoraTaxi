import { NotificationCategory, NotificationSeverity, Prisma, TriggerActionType, TriggerExecutionStatus, TriggerRule } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { DomainEventsService } from '../notifications/domain-events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TriggerActionRequest, TriggerActionResult } from './triggers.types';

@Injectable()
export class TriggerActionsService {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async dispatch(request: TriggerActionRequest): Promise<TriggerActionResult> {
    switch (request.rule.actionType) {
      case TriggerActionType.SEND_NOTIFICATION:
        return this.sendNotification(request);
      case TriggerActionType.START_WORKFLOW:
        return this.publishActionRequest(request, 'trigger.action.start_workflow.requested');
      case TriggerActionType.CREATE_APPROVAL:
        return this.publishActionRequest(request, 'trigger.action.create_approval.requested');
      case TriggerActionType.START_AGENT_RUN:
        return this.publishActionRequest(request, 'trigger.action.start_agent_run.requested');
      case TriggerActionType.ENQUEUE_FOLLOWUP_TASK:
        return this.publishActionRequest(request, 'trigger.action.enqueue_followup_task.requested');
      case TriggerActionType.NO_OP:
      default:
        return {
          actionType: TriggerActionType.NO_OP,
          status: TriggerExecutionStatus.SKIPPED,
          resultSummary: 'Trigger rule evaluated successfully and intentionally took no action.',
        };
    }
  }

  private async sendNotification(request: TriggerActionRequest) {
    const config = (request.rule.actionConfig ?? {}) as Record<string, unknown>;
    const recipients = (config.recipients ?? request.event.payload.recipients ?? {}) as Record<string, unknown>;

    const result = await this.notificationsService.createForRecipients({
      organizationId: request.event.organizationId ?? request.rule.organizationId ?? null,
      category: (config.category as NotificationCategory | undefined) ?? NotificationCategory.SYSTEM,
      title:
        (config.title as string | undefined) ??
        `Trigger fired: ${request.rule.name}`,
      message:
        (config.message as string | undefined) ??
        `Event ${request.event.eventType} matched trigger rule ${request.rule.name}.`,
      severity:
        (config.severity as NotificationSeverity | undefined) ?? NotificationSeverity.INFO,
      actionUrl: (config.actionUrl as string | undefined) ?? null,
      entityType: request.event.aggregateType,
      entityId: request.event.aggregateId ?? null,
      metadata: {
        triggerRuleId: request.rule.id,
        domainEventId: request.event.id,
        dedupeKey: request.dedupeKey ?? null,
      } as Prisma.InputJsonValue,
      userIds: Array.isArray(recipients.userIds) ? (recipients.userIds as string[]) : undefined,
      roleCodes: Array.isArray(recipients.roleCodes) ? (recipients.roleCodes as string[]) : undefined,
      permissionCodes: Array.isArray(recipients.permissionCodes)
        ? (recipients.permissionCodes as string[])
        : undefined,
    });

    return {
      actionType: TriggerActionType.SEND_NOTIFICATION,
      status: TriggerExecutionStatus.SUCCEEDED,
      resultSummary: `Created ${result.createdCount} notification(s).`,
      notificationId: null,
      metadata: {
        createdCount: result.createdCount,
      },
    } satisfies TriggerActionResult;
  }

  private async publishActionRequest(
    request: TriggerActionRequest,
    eventType: string,
  ): Promise<TriggerActionResult> {
    await this.domainEventsService.publish({
      organizationId: request.event.organizationId ?? request.rule.organizationId ?? null,
      eventType,
      aggregateType: 'trigger-rule',
      aggregateId: request.rule.id,
      sourceModule: 'triggers',
      payload: {
        triggerRuleId: request.rule.id,
        sourceDomainEventId: request.event.id,
        sourceEventType: request.event.eventType,
        sourceAggregateType: request.event.aggregateType,
        sourceAggregateId: request.event.aggregateId,
        actionType: request.rule.actionType,
        actionTarget: request.rule.actionTarget,
        actionConfig: request.rule.actionConfig ?? null,
        dedupeKey: request.dedupeKey ?? null,
      },
      correlationId: request.event.correlationId ?? request.event.id,
      causationId: request.event.id,
      actorType: request.event.actorType ?? null,
      actorId: request.event.actorId ?? null,
      triggeredByUserId:
        request.event.actorType === 'USER' ? request.event.actorId ?? null : null,
    });

    return {
      actionType: request.rule.actionType,
      status: TriggerExecutionStatus.SUCCEEDED,
      resultSummary: `Published follow-up trigger action request for ${request.rule.actionType}.`,
    };
  }
}
