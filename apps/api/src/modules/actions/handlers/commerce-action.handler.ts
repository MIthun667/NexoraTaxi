import { Injectable } from '@nestjs/common';

import { ShopifySyncService } from '../../integrations/shopify/shopify-sync.service';
import { ActionTypes } from '../action.constants';
import {
  ActionExecutionContext,
  ActionExecutionRequest,
  ActionExecutionResult,
  ActionHandler,
} from '../action.types';

@Injectable()
export class CommerceActionHandler implements ActionHandler {
  constructor(private readonly shopifySyncService: ShopifySyncService) {}

  supportedActionTypes() {
    return [ActionTypes.CONNECT_STRIPE, ActionTypes.RUN_SHOPIFY_SYNC];
  }

  async execute(
    request: ActionExecutionRequest,
    _context: ActionExecutionContext,
  ): Promise<ActionExecutionResult> {
    if (request.actionType === ActionTypes.CONNECT_STRIPE) {
      return {
        success: true,
        executionStatus: 'SUCCEEDED',
        resultSummary: 'Stripe connection handoff prepared successfully.',
        entityType: 'integration-stripe-account',
        entityId: null,
        metadata: {
          actionUrl:
            typeof request.payload?.actionUrl === 'string'
              ? request.payload.actionUrl
              : `/shopify?focus=finance&organizationId=${request.organizationId}`,
          mode: 'handoff',
        },
      };
    }

    const limit =
      typeof request.payload?.limit === 'number'
        ? request.payload.limit
        : typeof request.payload?.limit === 'string'
          ? Number(request.payload.limit)
          : undefined;
    const run = await this.shopifySyncService.syncAllSystem(
      request.organizationId,
      typeof limit === 'number' && Number.isFinite(limit) ? limit : undefined,
    );

    return {
      success: true,
      executionStatus: 'SUCCEEDED',
      resultSummary:
        run.status === 'PARTIAL_SUCCESS'
          ? 'Shopify sync completed with limited protected-data access.'
          : 'Shopify sync completed successfully.',
      entityType: 'shopify-sync-run',
      entityId: run.id,
      metadata: {
        syncRunId: run.id,
        syncStatus: run.status,
        recordsProcessed: run.recordsProcessed,
      },
    };
  }
}
