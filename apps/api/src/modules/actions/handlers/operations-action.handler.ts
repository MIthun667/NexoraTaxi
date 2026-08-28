import { Injectable } from '@nestjs/common';

import { CreateWorkOrderDto } from '../../operations/dto/create-work-order.dto';
import { UpdateWorkOrderDto } from '../../operations/dto/update-work-order.dto';
import { WorkOrdersService } from '../../operations/work-orders.service';
import { ActionTypes } from '../action.constants';
import { ActionExecutionContext, ActionExecutionRequest, ActionExecutionResult, ActionHandler } from '../action.types';

@Injectable()
export class OperationsActionHandler implements ActionHandler {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  supportedActionTypes() {
    return [ActionTypes.CREATE_WORK_ORDER, ActionTypes.UPDATE_WORK_ORDER_PRIORITY];
  }

  async execute(request: ActionExecutionRequest, context: ActionExecutionContext): Promise<ActionExecutionResult> {
    const principal = {
      organizationId: context.organizationId,
      userId: context.actorUserId ?? '',
      permissions: [],
      roles: [],
      email: '',
      isPlatformOwner: false,
    };

    if (request.actionType === ActionTypes.CREATE_WORK_ORDER) {
      const response = await this.workOrdersService.createWorkOrder(
        request.payload as unknown as CreateWorkOrderDto,
        principal,
      );
      return {
        success: true,
        executionStatus: 'SUCCEEDED',
        resultSummary: 'Work order created successfully.',
        entityType: 'work-order',
        entityId: response.data.id,
      };
    }

    await this.workOrdersService.updateWorkOrder(
      request.targetEntityId!,
      request.payload as unknown as UpdateWorkOrderDto,
      principal,
    );
    return { success: true, executionStatus: 'SUCCEEDED', resultSummary: 'Work order updated successfully.', entityType: 'work-order', entityId: request.targetEntityId };
  }
}
