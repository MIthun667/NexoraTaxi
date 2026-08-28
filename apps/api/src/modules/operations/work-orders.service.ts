import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import {
  OperationsEvents,
  WorkOrderCreatedEventPayload,
  WorkOrderUpdatedEventPayload,
} from './events/operations.events';
import { toWorkOrderResponse } from './mappers/operations.mapper';
import { OperationsPolicyService } from './policies/operations-policy.service';
import { WorkOrdersRepository } from './work-orders.repository';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly workOrdersRepository: WorkOrdersRepository,
    private readonly operationsPolicyService: OperationsPolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async createWorkOrder(dto: CreateWorkOrderDto, principal?: CurrentPrincipal) {
    const workOrder = await this.workOrdersRepository.createWorkOrder({
      organization: { connect: { id: dto.organizationId } },
      ...(dto.zoneId ? { zone: { connect: { id: dto.zoneId } } } : {}),
      workOrderCode: dto.workOrderCode,
      title: dto.title,
      description: dto.description,
      workType: dto.workType,
      status: dto.status,
      priority: dto.priority,
      createdByUser: principal?.userId ? { connect: { id: principal.userId } } : undefined,
      scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : undefined,
      scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : undefined,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.record({
      action: 'work-order.create',
      entityType: 'work-order',
      entityId: workOrder.id,
      organizationId: workOrder.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Created work order ${workOrder.workOrderCode}.`,
    });

    const payload: WorkOrderCreatedEventPayload = {
      workOrderId: workOrder.id,
      organizationId: workOrder.organizationId,
      workOrderCode: workOrder.workOrderCode,
      workType: workOrder.workType,
      status: workOrder.status,
      priority: workOrder.priority,
      zoneId: workOrder.zoneId,
    };

    await this.domainEventsService.publish({
      organizationId: workOrder.organizationId,
      eventType: OperationsEvents.workOrderCreated,
      aggregateType: 'work-order',
      aggregateId: workOrder.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Work order created successfully.',
      toWorkOrderResponse(workOrder),
    );
  }

  async updateWorkOrder(id: string, dto: UpdateWorkOrderDto, principal?: CurrentPrincipal) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one work order field must be provided.');
    }

    const existing = await this.findWorkOrderById(id);
    this.operationsPolicyService.assertCanManageWorkOrders(principal, existing.organizationId);

    const workOrder = await this.workOrdersRepository.updateWorkOrder(id, {
      ...(dto.organizationId ? { organization: { connect: { id: dto.organizationId } } } : {}),
      ...(dto.zoneId !== undefined
        ? dto.zoneId
          ? { zone: { connect: { id: dto.zoneId } } }
          : { zone: { disconnect: true } }
        : {}),
      ...(dto.workOrderCode !== undefined ? { workOrderCode: dto.workOrderCode } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.workType !== undefined ? { workType: dto.workType } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.scheduledStartAt !== undefined
        ? { scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : null }
        : {}),
      ...(dto.scheduledEndAt !== undefined
        ? { scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : null }
        : {}),
      ...(dto.actualStartAt !== undefined
        ? { actualStartAt: dto.actualStartAt ? new Date(dto.actualStartAt) : null }
        : {}),
      ...(dto.actualEndAt !== undefined
        ? { actualEndAt: dto.actualEndAt ? new Date(dto.actualEndAt) : null }
        : {}),
      ...(dto.sourceType !== undefined ? { sourceType: dto.sourceType } : {}),
      ...(dto.sourceId !== undefined ? { sourceId: dto.sourceId } : {}),
      ...(dto.metadata !== undefined
        ? {
            metadata:
              dto.metadata === null ? Prisma.JsonNull : (dto.metadata as Prisma.InputJsonValue),
          }
        : {}),
    });

    await this.auditService.record({
      action: 'work-order.update',
      entityType: 'work-order',
      entityId: workOrder.id,
      organizationId: workOrder.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Updated work order ${workOrder.workOrderCode}.`,
      metadata: { changedFields: Object.keys(dto) },
    });

    const payload: WorkOrderUpdatedEventPayload = {
      workOrderId: workOrder.id,
      organizationId: workOrder.organizationId,
      changedFields: Object.keys(dto),
    };

    await this.domainEventsService.publish({
      organizationId: workOrder.organizationId,
      eventType: OperationsEvents.workOrderUpdated,
      aggregateType: 'work-order',
      aggregateId: workOrder.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Work order updated successfully.',
      toWorkOrderResponse(workOrder),
    );
  }

  private async findWorkOrderById(id: string) {
    const workOrder = await this.workOrdersRepository.findWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundException('Work order not found.');
    }
    return workOrder;
  }
}
