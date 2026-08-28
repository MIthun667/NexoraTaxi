import { Injectable } from '@nestjs/common';
import { AssetStatusCategory } from '@prisma/client';

import { CreateAssetMaintenanceRecordDto } from '../../assets/dto/create-asset-maintenance-record.dto';
import { UpdateAssetStatusDto } from '../../assets/dto/update-asset-status.dto';
import { AssetMaintenanceService } from '../../assets/asset-maintenance.service';
import { AssetStatusService } from '../../assets/asset-status.service';
import { ActionTypes } from '../action.constants';
import { ActionExecutionContext, ActionExecutionRequest, ActionExecutionResult, ActionHandler } from '../action.types';

@Injectable()
export class AssetActionHandler implements ActionHandler {
  constructor(
    private readonly assetMaintenanceService: AssetMaintenanceService,
    private readonly assetStatusService: AssetStatusService,
  ) {}

  supportedActionTypes() {
    return [ActionTypes.SCHEDULE_ASSET_MAINTENANCE, ActionTypes.UPDATE_ASSET_STATUS];
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

    if (request.actionType === ActionTypes.SCHEDULE_ASSET_MAINTENANCE) {
      const dto = request.payload as unknown as CreateAssetMaintenanceRecordDto;
      const response = await this.assetMaintenanceService.createMaintenanceRecord(
        request.targetEntityId!,
        dto,
        principal,
      );
      return {
        success: true,
        executionStatus: 'SUCCEEDED',
        resultSummary: 'Asset maintenance scheduled successfully.',
        entityType: 'asset-maintenance-record',
        entityId: response.data.id,
      };
    }

    const payload = request.payload ?? {};
    const dto: UpdateAssetStatusDto = {
      category: (payload.category as AssetStatusCategory) ?? AssetStatusCategory.OPERATIONAL_STATUS,
      nextValue: String(payload.nextValue ?? ''),
      reason: (payload.reason as string | undefined) ?? undefined,
      metadata: (payload.metadata as Record<string, unknown> | undefined) ?? undefined,
    };
    await this.assetStatusService.updateStatus(request.targetEntityId!, dto, principal);
    return { success: true, executionStatus: 'SUCCEEDED', resultSummary: 'Asset status updated successfully.', entityType: 'asset', entityId: request.targetEntityId };
  }
}
