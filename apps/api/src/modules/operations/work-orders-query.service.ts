import { Injectable, NotFoundException } from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import { ListWorkOrdersQueryDto } from './dto/list-work-orders-query.dto';
import { buildWorkOrdersWhere } from './mappers/work-orders-where.builder';
import { toWorkOrderResponse } from './mappers/operations.mapper';
import { OperationsPolicyService } from './policies/operations-policy.service';
import { WorkOrderDetailPresenter } from './presenters/work-order-detail.presenter';
import { WorkOrdersRepository } from './work-orders.repository';

@Injectable()
export class WorkOrdersQueryService {
  constructor(
    private readonly workOrdersRepository: WorkOrdersRepository,
    private readonly operationsPolicyService: OperationsPolicyService,
  ) {}

  async listWorkOrders(query: ListWorkOrdersQueryDto, principal?: CurrentPrincipal) {
    const { page, limit, skip } = resolvePagination(query);
    const where = buildWorkOrdersWhere(query, principal);
    const [items, total] = await Promise.all([
      this.workOrdersRepository.listWorkOrders(where, skip, limit),
      this.workOrdersRepository.countWorkOrders(where),
    ]);

    return buildPaginatedResponse(
      'Work orders retrieved successfully.',
      items.map((item) => toWorkOrderResponse(item)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getWorkOrderDetail(id: string, principal?: CurrentPrincipal) {
    const workOrder = await this.workOrdersRepository.findWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundException('Work order not found.');
    }

    this.operationsPolicyService.assertCanViewWorkOrders(principal, workOrder.organizationId);

    const detail: WorkOrderDetailPresenter = {
      ...toWorkOrderResponse(workOrder),
      sourceType: workOrder.sourceType,
      sourceId: workOrder.sourceId,
      metadata: workOrder.metadata,
      lifecycle: {
        status: workOrder.status,
        priority: workOrder.priority,
        requestedAt: workOrder.requestedAt,
        scheduledStartAt: workOrder.scheduledStartAt,
        scheduledEndAt: workOrder.scheduledEndAt,
        actualStartAt: workOrder.actualStartAt,
        actualEndAt: workOrder.actualEndAt,
        isBlocked: workOrder.status === 'BLOCKED',
        isCompleted: workOrder.status === 'COMPLETED',
      },
    };

    return buildSuccessResponse('Work order retrieved successfully.', detail);
  }

  async getWorkOrderSummary(organizationId: string) {
    const [plannedCount, activeCount, blockedCount, completedCount] =
      await this.workOrdersRepository.getSummaryCounts(organizationId);

    return buildSuccessResponse('Work order summary retrieved successfully.', {
      organizationId,
      plannedCount,
      activeCount,
      blockedCount,
      completedCount,
      generatedAt: new Date().toISOString(),
    });
  }
}
