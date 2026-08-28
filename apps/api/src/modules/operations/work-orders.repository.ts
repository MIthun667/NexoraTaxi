import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { WORK_ORDER_SELECT } from './mappers/operations.mapper';

@Injectable()
export class WorkOrdersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  createWorkOrder(data: Prisma.WorkOrderCreateInput) {
    return this.prismaService.workOrder.create({
      data,
      select: WORK_ORDER_SELECT,
    });
  }

  updateWorkOrder(id: string, data: Prisma.WorkOrderUpdateInput) {
    return this.prismaService.workOrder.update({
      where: { id },
      data,
      select: WORK_ORDER_SELECT,
    });
  }

  findWorkOrderById(id: string) {
    return this.prismaService.workOrder.findUnique({
      where: { id },
      select: WORK_ORDER_SELECT,
    });
  }

  listWorkOrders(where: Prisma.WorkOrderWhereInput, skip: number, take: number) {
    return this.prismaService.workOrder.findMany({
      where,
      select: WORK_ORDER_SELECT,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take,
    });
  }

  countWorkOrders(where: Prisma.WorkOrderWhereInput) {
    return this.prismaService.workOrder.count({ where });
  }

  getSummaryCounts(organizationId: string) {
    return this.prismaService.$transaction([
      this.prismaService.workOrder.count({ where: { organizationId, status: 'PLANNED' } }),
      this.prismaService.workOrder.count({ where: { organizationId, status: 'ACTIVE' } }),
      this.prismaService.workOrder.count({ where: { organizationId, status: 'BLOCKED' } }),
      this.prismaService.workOrder.count({ where: { organizationId, status: 'COMPLETED' } }),
    ]);
  }
}
