import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { SCHEDULE_SHIFT_SELECT } from './mappers/scheduling.mapper';

@Injectable()
export class ScheduleShiftsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  createShift(data: Prisma.ScheduleShiftCreateInput) {
    return this.prismaService.scheduleShift.create({
      data,
      select: SCHEDULE_SHIFT_SELECT,
    });
  }

  updateShift(id: string, data: Prisma.ScheduleShiftUpdateInput) {
    return this.prismaService.scheduleShift.update({
      where: { id },
      data,
      select: SCHEDULE_SHIFT_SELECT,
    });
  }

  findShiftById(id: string) {
    return this.prismaService.scheduleShift.findUnique({
      where: { id },
      select: SCHEDULE_SHIFT_SELECT,
    });
  }

  listShifts(where: Prisma.ScheduleShiftWhereInput, skip: number, take: number) {
    return this.prismaService.scheduleShift.findMany({
      where,
      select: SCHEDULE_SHIFT_SELECT,
      orderBy: [{ startsAt: 'asc' }],
      skip,
      take,
    });
  }

  countShifts(where: Prisma.ScheduleShiftWhereInput) {
    return this.prismaService.scheduleShift.count({ where });
  }

  countAssignments(shiftId: string) {
    return this.prismaService.resourceAssignment.count({
      where: {
        shiftId,
        status: { in: ['ASSIGNED', 'ACTIVE', 'PLANNED'] },
      },
    });
  }

  getSummaryCounts(organizationId: string) {
    return this.prismaService.$transaction([
      this.prismaService.scheduleShift.count({
        where: { organizationId, status: 'SCHEDULED' },
      }),
      this.prismaService.scheduleShift.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
      this.prismaService.scheduleShift.count({
        where: { organizationId, status: 'COMPLETED' },
      }),
    ]);
  }
}
