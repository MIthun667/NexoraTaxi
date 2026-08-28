import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RESOURCE_ASSIGNMENT_SELECT } from './mappers/assignment.mapper';

@Injectable()
export class AssignmentsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  createAssignment(data: Prisma.ResourceAssignmentCreateInput) {
    return this.prismaService.resourceAssignment.create({
      data,
      select: RESOURCE_ASSIGNMENT_SELECT,
    });
  }

  updateAssignment(id: string, data: Prisma.ResourceAssignmentUpdateInput) {
    return this.prismaService.resourceAssignment.update({
      where: { id },
      data,
      select: RESOURCE_ASSIGNMENT_SELECT,
    });
  }

  findAssignmentById(id: string) {
    return this.prismaService.resourceAssignment.findUnique({
      where: { id },
      select: RESOURCE_ASSIGNMENT_SELECT,
    });
  }

  listAssignments(where: Prisma.ResourceAssignmentWhereInput, skip: number, take: number) {
    return this.prismaService.resourceAssignment.findMany({
      where,
      select: RESOURCE_ASSIGNMENT_SELECT,
      orderBy: [{ assignedAt: 'desc' }],
      skip,
      take,
    });
  }

  countAssignments(where: Prisma.ResourceAssignmentWhereInput) {
    return this.prismaService.resourceAssignment.count({ where });
  }

  findPotentialConflicts(where: Prisma.ResourceAssignmentWhereInput) {
    return this.prismaService.resourceAssignment.findMany({
      where,
      select: RESOURCE_ASSIGNMENT_SELECT,
      orderBy: [{ assignedAt: 'desc' }],
      take: 25,
    });
  }
}
