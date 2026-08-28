import { Injectable } from '@nestjs/common';

import { CreateResourceAssignmentDto } from '../../assignments/dto/create-resource-assignment.dto';
import { ReleaseResourceAssignmentDto } from '../../assignments/dto/release-resource-assignment.dto';
import { AssignmentsService } from '../../assignments/assignments.service';
import { ActionTypes } from '../action.constants';
import { ActionExecutionContext, ActionExecutionRequest, ActionExecutionResult, ActionHandler } from '../action.types';

@Injectable()
export class AssignmentActionHandler implements ActionHandler {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  supportedActionTypes() {
    return [ActionTypes.CREATE_ASSIGNMENT, ActionTypes.RELEASE_ASSIGNMENT];
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

    if (request.actionType === ActionTypes.CREATE_ASSIGNMENT) {
      const response = await this.assignmentsService.create(
        request.payload as unknown as CreateResourceAssignmentDto,
        principal,
      );
      return {
        success: true,
        executionStatus: 'SUCCEEDED',
        resultSummary: 'Assignment created successfully.',
        entityType: 'resource-assignment',
        entityId: response.data.id,
      };
    }

    await this.assignmentsService.release(
      request.targetEntityId!,
      (request.payload as unknown as ReleaseResourceAssignmentDto) ?? { metadata: undefined },
      principal,
    );
    return { success: true, executionStatus: 'SUCCEEDED', resultSummary: 'Assignment released successfully.', entityType: 'resource-assignment', entityId: request.targetEntityId };
  }
}
