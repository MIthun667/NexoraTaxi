import { Injectable } from '@nestjs/common';
import { WorkforceStatusCategory } from '@prisma/client';

import { CreateResourceAssignmentDto } from '../../assignments/dto/create-resource-assignment.dto';
import { AssignmentsService } from '../../assignments/assignments.service';
import { CreateWorkforceMemberDto } from '../../workforce/dto/create-workforce-member.dto';
import { UpdateWorkforceStatusDto } from '../../workforce/dto/update-workforce-status.dto';
import { WorkforceService } from '../../workforce/workforce.service';
import { WorkforceStatusService } from '../../workforce/workforce-status.service';
import { ActionTypes } from '../action.constants';
import { ActionExecutionContext, ActionExecutionRequest, ActionExecutionResult, ActionHandler } from '../action.types';

@Injectable()
export class WorkforceActionHandler implements ActionHandler {
  constructor(
    private readonly workforceService: WorkforceService,
    private readonly workforceStatusService: WorkforceStatusService,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  supportedActionTypes() {
    return [
      ActionTypes.CREATE_WORKFORCE_MEMBER,
      ActionTypes.UPDATE_WORKFORCE_STATUS,
      ActionTypes.ASSIGN_WORKFORCE_TO_SHIFT,
    ];
  }

  async execute(request: ActionExecutionRequest, context: ActionExecutionContext): Promise<ActionExecutionResult> {
    if (request.actionType === ActionTypes.CREATE_WORKFORCE_MEMBER) {
      const dto = request.payload as unknown as CreateWorkforceMemberDto;
      const response = await this.workforceService.create(dto);
      return {
        success: true,
        executionStatus: 'SUCCEEDED',
        resultSummary: 'Workforce member created successfully.',
        entityType: 'workforce-member',
        entityId: response.data.id,
      };
    }

    if (request.actionType === ActionTypes.UPDATE_WORKFORCE_STATUS) {
      const payload = request.payload ?? {};
      const dto: UpdateWorkforceStatusDto = {
        category: (payload.category as WorkforceStatusCategory) ?? WorkforceStatusCategory.OPERATIONAL_STATUS,
        nextValue: String(payload.nextValue ?? ''),
        reason: (payload.reason as string | undefined) ?? undefined,
        metadata: (payload.metadata as Record<string, unknown> | undefined) ?? undefined,
      };
      await this.workforceStatusService.updateStatus(request.targetEntityId!, dto, {
        organizationId: context.organizationId,
        userId: context.actorUserId ?? '',
        permissions: [],
        roles: [],
        email: '',
      });
      return { success: true, executionStatus: 'SUCCEEDED', resultSummary: 'Workforce status updated successfully.', entityType: 'workforce-member', entityId: request.targetEntityId };
    }

    const dto = request.payload as unknown as CreateResourceAssignmentDto;
    const response = await this.assignmentsService.create(dto, {
      organizationId: context.organizationId,
      userId: context.actorUserId ?? '',
      permissions: [],
      roles: [],
      email: '',
    });

    return {
      success: true,
      executionStatus: 'SUCCEEDED',
      resultSummary: 'Workforce assignment created successfully.',
      entityType: 'resource-assignment',
      entityId: response.data.id,
    };
  }
}
