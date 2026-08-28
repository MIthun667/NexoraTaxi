import { NotificationCategory, NotificationSeverity, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { ConnectorActionsService } from '../../integrations/connector-actions.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { ActionTypes } from '../action.constants';
import { ActionExecutionContext, ActionExecutionRequest, ActionExecutionResult, ActionHandler } from '../action.types';

@Injectable()
export class NotificationActionHandler implements ActionHandler {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly connectorActionsService: ConnectorActionsService,
  ) {}

  supportedActionTypes() {
    return [ActionTypes.SEND_NOTIFICATION, ActionTypes.ALERT_SUPERVISOR];
  }

  async execute(request: ActionExecutionRequest, context: ActionExecutionContext): Promise<ActionExecutionResult> {
    const payload = request.payload ?? {};

    const connectorInstanceId =
      typeof payload.connectorInstanceId === 'string' ? payload.connectorInstanceId : null;

    if (connectorInstanceId) {
      const connectorActionType =
        request.actionType === ActionTypes.ALERT_SUPERVISOR ? 'postAlert' : 'sendMessage';
      const connectorResult = await this.connectorActionsService.execute({
        organizationId: context.organizationId,
        connectorInstanceId,
        actionType: connectorActionType,
        targetRef:
          (payload.channel as string | undefined) ??
          (payload.email as string | undefined) ??
          null,
        payload,
        metadata: {
          proposalId: request.proposalId,
          actionType: request.actionType,
        },
      });

      return {
        success: connectorResult.success,
        executionStatus: connectorResult.success ? 'SUCCEEDED' : 'FAILED',
        resultSummary: connectorResult.summary,
        entityType: 'connector-action',
        metadata: {
          connectorInstanceId,
          externalRef: connectorResult.externalRef ?? null,
        },
      };
    }

    const result = await this.notificationsService.createForRecipients({
      organizationId: context.organizationId,
      category: (payload.category as NotificationCategory | undefined) ?? NotificationCategory.SYSTEM,
      title: (payload.title as string | undefined) ?? request.summary,
      message: (payload.message as string | undefined) ?? request.summary,
      severity: (payload.severity as NotificationSeverity | undefined) ?? NotificationSeverity.INFO,
      actionUrl: (payload.actionUrl as string | undefined) ?? null,
      entityType: request.targetEntityType ?? null,
      entityId: request.targetEntityId ?? null,
      metadata: {
        proposalId: request.proposalId,
        actorUserId: context.actorUserId ?? null,
      } as Prisma.InputJsonValue,
      userIds: (payload.userIds as string[] | undefined) ?? undefined,
      roleCodes:
        request.actionType === ActionTypes.ALERT_SUPERVISOR
          ? ((payload.roleCodes as string[] | undefined) ?? ['platform.admin'])
          : ((payload.roleCodes as string[] | undefined) ?? undefined),
      permissionCodes: (payload.permissionCodes as string[] | undefined) ?? undefined,
    });

    return {
      success: true,
      executionStatus: 'SUCCEEDED',
      resultSummary: `Created ${result.createdCount} notification(s).`,
      entityType: 'notification',
      metadata: { createdCount: result.createdCount },
    };
  }
}
