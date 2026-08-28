import {
  NotificationCategory,
  NotificationSeverity,
  Prisma,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { normalizeEventName } from '../../common/events';
import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import {
  DomainEventDispatchRecord,
  DomainEventPayload,
  DomainEventRecipients,
  NotificationEnvelope,
} from '../events/domain-events.types';
import { TriggerEngineService } from '../triggers/trigger-engine.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class EventHandlersService {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly moduleRef: ModuleRef,
    private readonly logger: PlatformLoggerService,
  ) {}

  async handle(event: DomainEventDispatchRecord) {
    let notificationHandled = false;
    const normalizedEvent = normalizeEventName(event.eventType);

    switch (true) {
      case event.eventType.startsWith('approval.'):
        await this.handleApprovalEvent(event);
        notificationHandled = true;
        break;
      case event.eventType.startsWith('workflow.'):
        await this.handleWorkflowEvent(event);
        notificationHandled = true;
        break;
      case event.eventType.startsWith('driver.') || event.eventType.startsWith('operator.'):
        await this.handleOperatorEvent(event);
        notificationHandled = true;
        break;
      case event.eventType.startsWith('fleet.') || event.eventType.startsWith('asset.'):
        await this.handleAssetEvent(event);
        notificationHandled = true;
        break;
      case event.eventType.startsWith('dispatch.') || event.eventType.startsWith('operations.'):
        await this.handleOperationsEvent(event);
        notificationHandled = true;
        break;
      default:
        this.logger.debug({
          event: 'domain_event.unhandled',
          domainEventId: event.id,
          eventType: event.eventType,
          canonicalEventType: normalizedEvent.canonicalEventType,
        });
        break;
    }

    if (!notificationHandled) {
      this.logger.debug({
        event: 'domain_event.notification_skipped',
        domainEventId: event.id,
        eventType: event.eventType,
        canonicalEventType: normalizedEvent.canonicalEventType,
      });
    }

    // TODO(universal-events): drop legacy taxi-era prefix branching here once all producers publish canonical event names.
    await this.dispatchTriggers(event);
  }

  async handleApprovalEvent(event: DomainEventDispatchRecord) {
    return this.dispatchNotification(event);
  }

  async handleWorkflowEvent(event: DomainEventDispatchRecord) {
    return this.dispatchNotification(event);
  }

  async handleOperatorEvent(event: DomainEventDispatchRecord) {
    return this.dispatchNotification(event);
  }

  async handleAssetEvent(event: DomainEventDispatchRecord) {
    return this.dispatchNotification(event);
  }

  async handleOperationsEvent(event: DomainEventDispatchRecord) {
    return this.dispatchNotification(event);
  }

  private async dispatchNotification(event: DomainEventDispatchRecord) {
    const notification = event.payload.notification;
    if (!notification) {
      return;
    }

    await this.notificationsService.createForRecipients({
      organizationId: event.organizationId,
      category: notification.category,
      title: notification.title,
      message: notification.message,
      severity: notification.severity,
      actionUrl: notification.actionUrl,
      entityType: notification.entityType ?? event.aggregateType,
      entityId: notification.entityId ?? event.aggregateId ?? null,
      metadata:
        notification.metadata ??
        ({
          domainEventId: event.id,
          eventType: event.eventType,
        } as Prisma.InputJsonValue),
      userIds: event.payload.recipients?.userIds,
      roleCodes: event.payload.recipients?.roleCodes,
      permissionCodes: event.payload.recipients?.permissionCodes,
    });
  }

  private async dispatchTriggers(event: DomainEventDispatchRecord) {
    const triggerEngineService = this.moduleRef.get(TriggerEngineService, {
      strict: false,
    });

    if (!triggerEngineService) {
      return;
    }

    try {
      await triggerEngineService.processDomainEvent(event);
    } catch (error) {
      this.logger.warn({
        event: 'trigger_engine.dispatch_failed',
        domainEventId: event.id,
        eventType: event.eventType,
        reason: error instanceof Error ? error.message : 'Unknown trigger dispatch failure',
      });
    }
  }
}
