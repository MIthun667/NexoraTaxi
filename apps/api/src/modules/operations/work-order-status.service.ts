import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkOrderStatus } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { UpdateWorkOrderStatusDto } from './dto/update-work-order-status.dto';
import {
  OperationsEvents,
  WorkOrderStatusChangedEventPayload,
} from './events/operations.events';
import { toWorkOrderResponse } from './mappers/operations.mapper';
import { OperationsPolicyService } from './policies/operations-policy.service';
import { WorkOrdersRepository } from './work-orders.repository';

@Injectable()
export class WorkOrderStatusService {
  constructor(
    private readonly workOrdersRepository: WorkOrdersRepository,
    private readonly operationsPolicyService: OperationsPolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async updateStatus(id: string, dto: UpdateWorkOrderStatusDto, principal?: CurrentPrincipal) {
    const workOrder = await this.workOrdersRepository.findWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundException('Work order not found.');
    }

    this.operationsPolicyService.assertCanTransitionWorkOrder(
      principal,
      workOrder.organizationId,
      workOrder.status,
      dto.status,
    );

    const updateData: Prisma.WorkOrderUpdateInput = {
      status: dto.status,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    };

    if (dto.status === WorkOrderStatus.ACTIVE && !workOrder.actualStartAt) {
      updateData.actualStartAt = new Date();
    }
    if (dto.status === WorkOrderStatus.COMPLETED) {
      updateData.actualEndAt = new Date();
    }

    const updated = await this.workOrdersRepository.updateWorkOrder(id, updateData);

    await this.auditService.record({
      action: 'work-order.status.update',
      entityType: 'work-order',
      entityId: updated.id,
      organizationId: updated.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Transitioned work order ${updated.workOrderCode} from ${workOrder.status.toLowerCase()} to ${updated.status.toLowerCase()}.`,
      metadata: {
        previousStatus: workOrder.status,
        nextStatus: updated.status,
        reason: dto.reason ?? null,
      },
    });

    const payload: WorkOrderStatusChangedEventPayload = {
      workOrderId: updated.id,
      organizationId: updated.organizationId,
      previousStatus: workOrder.status,
      nextStatus: updated.status,
      reason: dto.reason ?? null,
      changedByUserId: principal?.userId ?? null,
    };

    await this.domainEventsService.publish({
      organizationId: updated.organizationId,
      eventType: OperationsEvents.workOrderStatusChanged,
      aggregateType: 'work-order',
      aggregateId: updated.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    if (updated.status === WorkOrderStatus.BLOCKED) {
      await this.domainEventsService.publish({
        organizationId: updated.organizationId,
        eventType: OperationsEvents.workOrderBlocked,
        aggregateType: 'work-order',
        aggregateId: updated.id,
        triggeredByUserId: principal?.userId ?? null,
        payload,
      });
    }

    if (updated.status === WorkOrderStatus.COMPLETED) {
      await this.domainEventsService.publish({
        organizationId: updated.organizationId,
        eventType: OperationsEvents.workOrderCompleted,
        aggregateType: 'work-order',
        aggregateId: updated.id,
        triggeredByUserId: principal?.userId ?? null,
        payload,
      });
    }

    return buildSuccessResponse(
      'Work order status updated successfully.',
      toWorkOrderResponse(updated),
    );
  }
}
