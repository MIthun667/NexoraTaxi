import { Injectable } from '@nestjs/common';

import { CreateScheduleShiftDto } from '../../scheduling/dto/create-schedule-shift.dto';
import { AllocateShiftCapacityDto } from '../../scheduling/dto/allocate-shift-capacity.dto';
import { ScheduleShiftsService } from '../../scheduling/schedule-shifts.service';
import { ShiftCapacityService } from '../../scheduling/shift-capacity.service';
import { ActionTypes } from '../action.constants';
import { ActionExecutionContext, ActionExecutionRequest, ActionExecutionResult, ActionHandler } from '../action.types';

@Injectable()
export class SchedulingActionHandler implements ActionHandler {
  constructor(
    private readonly scheduleShiftsService: ScheduleShiftsService,
    private readonly shiftCapacityService: ShiftCapacityService,
  ) {}

  supportedActionTypes() {
    return [ActionTypes.CREATE_SHIFT, ActionTypes.UPDATE_SHIFT_CAPACITY];
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

    if (request.actionType === ActionTypes.CREATE_SHIFT) {
      const response = await this.scheduleShiftsService.createShift(
        request.payload as unknown as CreateScheduleShiftDto,
        principal,
      );
      return {
        success: true,
        executionStatus: 'SUCCEEDED',
        resultSummary: 'Schedule shift created successfully.',
        entityType: 'schedule-shift',
        entityId: response.data.id,
      };
    }

    await this.shiftCapacityService.updateCapacity(
      request.targetEntityId!,
      request.payload as unknown as AllocateShiftCapacityDto,
      principal,
    );
    return { success: true, executionStatus: 'SUCCEEDED', resultSummary: 'Shift capacity updated successfully.', entityType: 'schedule-shift', entityId: request.targetEntityId };
  }
}
