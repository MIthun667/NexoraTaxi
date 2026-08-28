import { BadRequestException, Injectable } from '@nestjs/common';

import { ActionHandler } from './action.types';
import { WorkforceActionHandler } from './handlers/workforce-action.handler';
import { AssetActionHandler } from './handlers/asset-action.handler';
import { OperationsActionHandler } from './handlers/operations-action.handler';
import { SchedulingActionHandler } from './handlers/scheduling-action.handler';
import { IncidentActionHandler } from './handlers/incident-action.handler';
import { AssignmentActionHandler } from './handlers/assignment-action.handler';
import { NotificationActionHandler } from './handlers/notification-action.handler';
import { GovernanceActionHandler } from './handlers/governance-action.handler';
import { CommerceActionHandler } from './handlers/commerce-action.handler';

@Injectable()
export class ActionRegistryService {
  private readonly handlers = new Map<string, ActionHandler>();

  constructor(
    workforceActionHandler: WorkforceActionHandler,
    assetActionHandler: AssetActionHandler,
    operationsActionHandler: OperationsActionHandler,
    schedulingActionHandler: SchedulingActionHandler,
    incidentActionHandler: IncidentActionHandler,
    assignmentActionHandler: AssignmentActionHandler,
    notificationActionHandler: NotificationActionHandler,
    governanceActionHandler: GovernanceActionHandler,
    commerceActionHandler: CommerceActionHandler,
  ) {
    [
      workforceActionHandler,
      assetActionHandler,
      operationsActionHandler,
      schedulingActionHandler,
      incidentActionHandler,
      assignmentActionHandler,
      notificationActionHandler,
      governanceActionHandler,
      commerceActionHandler,
    ].forEach((handler) => {
      handler.supportedActionTypes().forEach((actionType) => {
        if (this.handlers.has(actionType)) {
          throw new Error(`Duplicate action handler registration for ${actionType}.`);
        }
        this.handlers.set(actionType, handler);
      });
    });
  }

  getHandler(actionType: string): ActionHandler {
    const handler = this.handlers.get(actionType);
    if (!handler) {
      throw new BadRequestException(`Unsupported action type: ${actionType}`);
    }

    return handler;
  }
}
