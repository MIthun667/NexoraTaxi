import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { OPERATIONAL_ZONE_SELECT } from './mappers/operations.mapper';

@Injectable()
export class OperationalZonesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  createZone(data: Prisma.OperationalZoneCreateInput) {
    return this.prismaService.operationalZone.create({
      data,
      select: OPERATIONAL_ZONE_SELECT,
    });
  }

  updateZone(id: string, data: Prisma.OperationalZoneUpdateInput) {
    return this.prismaService.operationalZone.update({
      where: { id },
      data,
      select: OPERATIONAL_ZONE_SELECT,
    });
  }

  findZoneById(id: string) {
    return this.prismaService.operationalZone.findUnique({
      where: { id },
      select: OPERATIONAL_ZONE_SELECT,
    });
  }

  findZoneWithRelations(id: string) {
    return this.prismaService.operationalZone.findUnique({
      where: { id },
      include: {
        childZones: {
          select: OPERATIONAL_ZONE_SELECT,
          orderBy: [{ name: 'asc' }],
        },
      },
    });
  }

  listZones(where: Prisma.OperationalZoneWhereInput, skip: number, take: number) {
    return this.prismaService.operationalZone.findMany({
      where,
      select: OPERATIONAL_ZONE_SELECT,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take,
    });
  }

  countZones(where: Prisma.OperationalZoneWhereInput) {
    return this.prismaService.operationalZone.count({ where });
  }
}
