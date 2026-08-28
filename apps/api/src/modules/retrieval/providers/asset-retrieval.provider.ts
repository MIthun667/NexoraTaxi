import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { RetrievalContext, RetrievalProvider, RetrievalProviderResult } from '../retrieval.types';

@Injectable()
export class AssetRetrievalProvider implements RetrievalProvider {
  readonly name = 'assets';

  constructor(private readonly prismaService: PrismaService) {}

  supports(request: RetrievalContext['request']): boolean {
    return request.targetEntityType === 'asset';
  }

  async retrieve(context: RetrievalContext): Promise<RetrievalProviderResult> {
    const { organizationId, targetEntityId, maxRecords, includeRelated } = context.request;

    if (!targetEntityId) {
      return { contextNotes: ['Asset retrieval skipped because targetEntityId was not provided.'] };
    }

    const asset = await this.prismaService.asset.findFirst({
      where: { id: targetEntityId, organizationId, deletedAt: null },
      include: {
        maintenanceRecords: {
          orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
          take: maxRecords,
        },
        statusHistory: {
          orderBy: [{ effectiveAt: 'desc' }],
          take: maxRecords,
        },
        assignments: includeRelated
          ? {
              orderBy: [{ assignedAt: 'desc' }],
              take: maxRecords,
            }
          : false,
      },
    });

    if (!asset) {
      return { contextNotes: ['No asset was found for the requested scope.'] };
    }

    const pendingMaintenance = asset.maintenanceRecords.filter((record) =>
      ['SCHEDULED', 'OVERDUE', 'IN_PROGRESS'].includes(record.status),
    ).length;

    return {
      entitySnapshot: {
        id: asset.id,
        assetCode: asset.assetCode,
        assetType: asset.assetType,
        assetClass: asset.assetClass,
        name: asset.name,
        operationalStatus: asset.operationalStatus,
        complianceStatus: asset.complianceStatus,
        availabilityStatus: asset.availabilityStatus,
        zoneId: asset.zoneId,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      },
      relatedEntities: [
        ...asset.maintenanceRecords.map((record) => ({
          entityType: 'asset-maintenance-record',
          id: record.id,
          maintenanceType: record.maintenanceType,
          status: record.status,
          scheduledAt: record.scheduledAt,
          completedAt: record.completedAt,
        })),
        ...(asset.assignments ?? []).map((assignment) => ({
          entityType: 'resource-assignment',
          id: assignment.id,
          status: assignment.status,
          workOrderId: assignment.workOrderId,
          shiftId: assignment.shiftId,
        })),
      ],
      timelineEvents: asset.statusHistory.map((entry) => ({
        eventType: 'asset_status_history',
        category: entry.category,
        previousValue: entry.previousValue,
        nextValue: entry.nextValue,
        occurredAt: entry.effectiveAt,
      })),
      operationalMetrics: [
        { key: 'maintenance_open_count', label: 'Open maintenance records', value: pendingMaintenance },
      ],
      riskSignals: [
        ...(asset.complianceStatus !== 'COMPLIANT'
          ? [{ code: 'ASSET_COMPLIANCE_RISK', severity: 'HIGH' as const, message: 'Asset is not compliant.' }]
          : []),
        ...(asset.operationalStatus !== 'ACTIVE'
          ? [{ code: 'ASSET_OPERATIONAL_RISK', severity: 'MEDIUM' as const, message: 'Asset is not operationally active.' }]
          : []),
      ],
    };
  }
}
