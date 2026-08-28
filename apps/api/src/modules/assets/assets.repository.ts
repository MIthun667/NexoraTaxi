import { Injectable } from '@nestjs/common';
import { Prisma, AssetStatusCategory } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  ASSET_MAINTENANCE_SELECT,
  ASSET_SELECT,
  ASSET_STATUS_HISTORY_SELECT,
} from './mappers/asset.mapper';

@Injectable()
export class AssetsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  createAsset(data: Prisma.AssetCreateInput) {
    return this.prismaService.asset.create({
      data,
      select: ASSET_SELECT,
    });
  }

  updateAsset(id: string, data: Prisma.AssetUpdateInput) {
    return this.prismaService.asset.update({
      where: { id },
      data,
      select: ASSET_SELECT,
    });
  }

  findAssetById(id: string) {
    return this.prismaService.asset.findFirst({
      where: { id, deletedAt: null },
      select: ASSET_SELECT,
    });
  }

  findAssetWithRelations(id: string) {
    return this.prismaService.asset.findFirst({
      where: { id, deletedAt: null },
      include: {
        maintenanceRecords: {
          select: ASSET_MAINTENANCE_SELECT,
          orderBy: [{ createdAt: 'desc' }],
          take: 10,
        },
        statusHistory: {
          select: ASSET_STATUS_HISTORY_SELECT,
          orderBy: [{ effectiveAt: 'desc' }],
          take: 10,
        },
      },
    });
  }

  listAssets(where: Prisma.AssetWhereInput, skip: number, take: number) {
    return this.prismaService.asset.findMany({
      where,
      select: ASSET_SELECT,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take,
    });
  }

  countAssets(where: Prisma.AssetWhereInput) {
    return this.prismaService.asset.count({ where });
  }

  createStatusHistory(data: Prisma.AssetStatusHistoryCreateInput) {
    return this.prismaService.assetStatusHistory.create({
      data,
      select: ASSET_STATUS_HISTORY_SELECT,
    });
  }

  listStatusHistory(assetId: string) {
    return this.prismaService.assetStatusHistory.findMany({
      where: { assetId },
      select: ASSET_STATUS_HISTORY_SELECT,
      orderBy: [{ effectiveAt: 'desc' }],
    });
  }

  createMaintenanceRecord(data: Prisma.AssetMaintenanceRecordCreateInput) {
    return this.prismaService.assetMaintenanceRecord.create({
      data,
      select: ASSET_MAINTENANCE_SELECT,
    });
  }

  updateMaintenanceRecord(id: string, data: Prisma.AssetMaintenanceRecordUpdateInput) {
    return this.prismaService.assetMaintenanceRecord.update({
      where: { id },
      data,
      select: ASSET_MAINTENANCE_SELECT,
    });
  }

  findMaintenanceRecordById(id: string) {
    return this.prismaService.assetMaintenanceRecord.findUnique({
      where: { id },
      select: ASSET_MAINTENANCE_SELECT,
    });
  }

  listMaintenanceRecords(assetId: string) {
    return this.prismaService.assetMaintenanceRecord.findMany({
      where: { assetId },
      select: ASSET_MAINTENANCE_SELECT,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  listMaintenanceRecordsForOrganization(organizationId: string) {
    return this.prismaService.assetMaintenanceRecord.findMany({
      where: { organizationId },
      select: ASSET_MAINTENANCE_SELECT,
      orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  getReadinessCounts(organizationId: string) {
    return this.prismaService.$transaction([
      this.prismaService.asset.count({
        where: { organizationId, deletedAt: null, operationalStatus: 'ACTIVE' },
      }),
      this.prismaService.asset.count({
        where: { organizationId, deletedAt: null, complianceStatus: 'COMPLIANT' },
      }),
      this.prismaService.asset.count({
        where: { organizationId, deletedAt: null, availabilityStatus: 'AVAILABLE' },
      }),
      this.prismaService.assetMaintenanceRecord.count({
        where: {
          organizationId,
          status: { in: ['SCHEDULED', 'OVERDUE'] },
        },
      }),
    ]);
  }

  runInTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prismaService.$transaction(callback);
  }

  updateAssetStatus(
    tx: Prisma.TransactionClient,
    id: string,
    category: AssetStatusCategory,
    nextValue: string,
  ) {
    if (category === AssetStatusCategory.OPERATIONAL_STATUS) {
      return tx.asset.update({
        where: { id },
        data: { operationalStatus: nextValue as never },
      });
    }

    if (category === AssetStatusCategory.COMPLIANCE_STATUS) {
      return tx.asset.update({
        where: { id },
        data: { complianceStatus: nextValue as never },
      });
    }

    return tx.asset.update({
      where: { id },
      data: { availabilityStatus: nextValue as never },
    });
  }
}
