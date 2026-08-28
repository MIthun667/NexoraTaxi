import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { SCHEDULE_PLAN_SELECT, SCHEDULE_SHIFT_SELECT } from './mappers/scheduling.mapper';

@Injectable()
export class SchedulePlansRepository {
  constructor(private readonly prismaService: PrismaService) {}

  createPlan(data: Prisma.SchedulePlanCreateInput) {
    return this.prismaService.schedulePlan.create({
      data,
      select: SCHEDULE_PLAN_SELECT,
    });
  }

  updatePlan(id: string, data: Prisma.SchedulePlanUpdateInput) {
    return this.prismaService.schedulePlan.update({
      where: { id },
      data,
      select: SCHEDULE_PLAN_SELECT,
    });
  }

  findPlanById(id: string) {
    return this.prismaService.schedulePlan.findUnique({
      where: { id },
      select: SCHEDULE_PLAN_SELECT,
    });
  }

  findPlanWithRelations(id: string) {
    return this.prismaService.schedulePlan.findUnique({
      where: { id },
      include: {
        shifts: {
          select: SCHEDULE_SHIFT_SELECT,
          orderBy: [{ startsAt: 'asc' }],
        },
      },
    });
  }

  listPlans(where: Prisma.SchedulePlanWhereInput, skip: number, take: number) {
    return this.prismaService.schedulePlan.findMany({
      where,
      select: SCHEDULE_PLAN_SELECT,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take,
    });
  }

  countPlans(where: Prisma.SchedulePlanWhereInput) {
    return this.prismaService.schedulePlan.count({ where });
  }
}
