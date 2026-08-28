import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkOrderStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { DispatchRunResponse } from '../dispatch/mappers/dispatch.mapper';
import { DomainEventsService } from '../notifications/domain-events.service';
import { CreateOperationalZoneDto } from './dto/create-operational-zone.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { QueryOperationalZonesDto } from './dto/query-operational-zones.dto';
import { QueryOperationalTasksDto } from './dto/query-operational-tasks.dto';
import { QueryWorkOrdersDto } from './dto/query-work-orders.dto';
import { TransitionWorkOrderStatusDto } from './dto/transition-work-order-status.dto';
import { UpdateOperationalZoneDto } from './dto/update-operational-zone.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import {
  OPERATIONAL_ZONE_SELECT,
  toOperationalZoneResponse,
  toWorkOrderResponse,
  WORK_ORDER_SELECT,
} from './mappers/operations.mapper';
import { OperationalTask } from './interfaces/operational-task.interface';

@Injectable()
export class OperationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
    private readonly dispatchService: DispatchService,
  ) {}

  async createZone(dto: CreateOperationalZoneDto) {
    const zone = await this.prismaService.operationalZone.create({
      data: {
        ...dto,
        coverageDefinition: dto.coverageDefinition as Prisma.InputJsonValue | undefined,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
      select: OPERATIONAL_ZONE_SELECT,
    });
    return buildSuccessResponse('Operational zone created successfully.', toOperationalZoneResponse(zone));
  }

  async findZones(query: QueryOperationalZonesDto) {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();
    const where: Prisma.OperationalZoneWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.zoneType ? { zoneType: query.zoneType } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search
        ? {
            OR: [
              { zoneCode: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.operationalZone.findMany({
        where,
        select: OPERATIONAL_ZONE_SELECT,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.operationalZone.count({ where }),
    ]);
    return buildPaginatedResponse(
      'Operational zones retrieved successfully.',
      items.map((item) => toOperationalZoneResponse(item)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async findZone(id: string) {
    const zone = await this.findZoneById(id);
    return buildSuccessResponse('Operational zone retrieved successfully.', toOperationalZoneResponse(zone));
  }

  async updateZone(id: string, dto: UpdateOperationalZoneDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one operational zone field must be provided.');
    }
    await this.findZoneById(id);
    const zone = await this.prismaService.operationalZone.update({
      where: { id },
      data: {
        ...dto,
        coverageDefinition:
          dto.coverageDefinition === undefined
            ? undefined
            : dto.coverageDefinition === null
              ? Prisma.JsonNull
              : (dto.coverageDefinition as Prisma.InputJsonValue),
        metadata:
          dto.metadata === undefined
            ? undefined
            : dto.metadata === null
              ? Prisma.JsonNull
              : (dto.metadata as Prisma.InputJsonValue),
      },
      select: OPERATIONAL_ZONE_SELECT,
    });
    return buildSuccessResponse('Operational zone updated successfully.', toOperationalZoneResponse(zone));
  }

  async createWorkOrder(createdByUserId: string | undefined, dto: CreateWorkOrderDto) {
    const workOrder = await this.prismaService.workOrder.create({
      data: {
        ...dto,
        createdByUserId: createdByUserId ?? null,
        scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : null,
        scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : null,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
      select: WORK_ORDER_SELECT,
    });
    await this.auditService.record({
      action: 'work-order.create',
      entityType: 'work-order',
      entityId: workOrder.id,
      organizationId: workOrder.organizationId,
      actorUserId: createdByUserId ?? null,
      summary: `Created work order ${workOrder.workOrderCode}.`,
    });
    return buildSuccessResponse('Work order created successfully.', toWorkOrderResponse(workOrder));
  }

  async findWorkOrders(query: QueryWorkOrdersDto) {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();
    const where: Prisma.WorkOrderWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(search
        ? {
            OR: [
              { workOrderCode: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
              { workType: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.workOrder.findMany({
        where,
        select: WORK_ORDER_SELECT,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.workOrder.count({ where }),
    ]);
    return buildPaginatedResponse(
      'Work orders retrieved successfully.',
      items.map((item) => toWorkOrderResponse(item)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async findWorkOrder(id: string) {
    const workOrder = await this.findWorkOrderById(id);
    return buildSuccessResponse('Work order retrieved successfully.', toWorkOrderResponse(workOrder));
  }

  async listOperationalTasks(query: QueryOperationalTasksDto) {
    const dispatchResponse = await this.dispatchService.listRuns({
      page: query.page,
      limit: query.limit,
      search: query.search,
      organizationId: query.organizationId,
      zoneId: query.zoneId,
      assignmentId: query.assignmentId,
      dispatchStatus: query.status,
    });

    return buildPaginatedResponse(
      'Operational tasks retrieved successfully.',
      dispatchResponse.data.map((record) => this.mapDispatchRecordToOperationalTask(record)),
      dispatchResponse.meta,
    );
  }

  async getOperationalTaskById(taskId: string) {
    const dispatchResponse = await this.dispatchService.getRun(taskId);

    return buildSuccessResponse(
      'Operational task retrieved successfully.',
      this.mapDispatchRecordToOperationalTask(dispatchResponse.data),
    );
  }

  async updateWorkOrder(id: string, dto: UpdateWorkOrderDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one work order field must be provided.');
    }
    await this.findWorkOrderById(id);
    const workOrder = await this.prismaService.workOrder.update({
      where: { id },
      data: {
        ...dto,
        scheduledStartAt:
          dto.scheduledStartAt === undefined
            ? undefined
            : dto.scheduledStartAt
              ? new Date(dto.scheduledStartAt)
              : null,
        scheduledEndAt:
          dto.scheduledEndAt === undefined
            ? undefined
            : dto.scheduledEndAt
              ? new Date(dto.scheduledEndAt)
              : null,
        actualStartAt:
          dto.actualStartAt === undefined ? undefined : dto.actualStartAt ? new Date(dto.actualStartAt) : null,
        actualEndAt:
          dto.actualEndAt === undefined ? undefined : dto.actualEndAt ? new Date(dto.actualEndAt) : null,
        metadata:
          dto.metadata === undefined
            ? undefined
            : dto.metadata === null
              ? Prisma.JsonNull
              : (dto.metadata as Prisma.InputJsonValue),
      },
      select: WORK_ORDER_SELECT,
    });
    return buildSuccessResponse('Work order updated successfully.', toWorkOrderResponse(workOrder));
  }

  async transitionWorkOrderStatus(id: string, actorUserId: string | undefined, dto: TransitionWorkOrderStatusDto) {
    const workOrder = await this.findWorkOrderById(id);
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

    const updated = await this.prismaService.workOrder.update({
      where: { id },
      data: updateData,
      select: WORK_ORDER_SELECT,
    });

    await this.domainEventsService.publish({
      organizationId: updated.organizationId,
      eventType: 'work_order.status_changed',
      aggregateType: 'work-order',
      aggregateId: updated.id,
      triggeredByUserId: actorUserId ?? null,
      payload: { previousStatus: workOrder.status, nextStatus: dto.status, reason: dto.reason ?? null },
    });

    return buildSuccessResponse('Work order status updated successfully.', toWorkOrderResponse(updated));
  }

  private async findZoneById(id: string) {
    const zone = await this.prismaService.operationalZone.findUnique({
      where: { id },
      select: OPERATIONAL_ZONE_SELECT,
    });
    if (!zone) {
      throw new NotFoundException('Operational zone not found.');
    }
    return zone;
  }

  private async findWorkOrderById(id: string) {
    const workOrder = await this.prismaService.workOrder.findUnique({
      where: { id },
      select: WORK_ORDER_SELECT,
    });
    if (!workOrder) {
      throw new NotFoundException('Work order not found.');
    }
    return workOrder;
  }

  mapDispatchRecordToOperationalTask(dispatchRecord: DispatchRunResponse): OperationalTask {
    return {
      id: dispatchRecord.id,
      organizationId: dispatchRecord.organizationId,
      displayName: dispatchRecord.runCode,
      // TODO: Replace dispatch-derived task typing once universal work execution
      // persistence and naming become canonical and dispatch is reduced to a legacy adapter.
      taskType: 'dispatch-run',
      status: dispatchRecord.dispatchStatus,
      sourceModule: 'dispatch',
      relatedAssignmentId: dispatchRecord.assignmentId,
      zoneId: dispatchRecord.zoneId,
      createdAt: dispatchRecord.createdAt,
    };
  }
}
