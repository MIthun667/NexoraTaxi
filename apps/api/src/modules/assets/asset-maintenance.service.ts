import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetMaintenanceStatus, Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import {
  AssetEvents,
  AssetMaintenanceEventPayload,
} from './events/assets.events';
import { toAssetMaintenanceRecordResponse } from './mappers/asset.mapper';
import { AssetsPolicyService } from './policies/assets-policy.service';
import { CreateAssetMaintenanceRecordDto } from './dto/create-asset-maintenance-record.dto';
import { UpdateAssetMaintenanceRecordDto } from './dto/update-asset-maintenance-record.dto';
import { AssetsRepository } from './assets.repository';

@Injectable()
export class AssetMaintenanceService {
  constructor(
    private readonly assetsRepository: AssetsRepository,
    private readonly assetsPolicyService: AssetsPolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async createMaintenanceRecord(
    assetId: string,
    dto: CreateAssetMaintenanceRecordDto,
    principal?: CurrentPrincipal,
  ) {
    const asset = await this.assetsRepository.findAssetById(assetId);
    if (!asset) {
      throw new NotFoundException('Asset not found.');
    }

    this.assetsPolicyService.assertCanManageMaintenance(principal, asset.organizationId);

    const record = await this.assetsRepository.createMaintenanceRecord({
      organization: { connect: { id: dto.organizationId ?? asset.organizationId } },
      asset: { connect: { id: assetId } },
      maintenanceType: dto.maintenanceType,
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
      completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
      performedByWorkforceMember: dto.performedByWorkforceMemberId
        ? { connect: { id: dto.performedByWorkforceMemberId } }
        : undefined,
      vendorName: dto.vendorName,
      costAmount: dto.costAmount ? new Prisma.Decimal(dto.costAmount) : undefined,
      currencyCode: dto.currencyCode,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.record({
      action: 'asset.maintenance.create',
      entityType: 'asset-maintenance-record',
      entityId: record.id,
      organizationId: record.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Created maintenance record for asset ${asset.assetCode}.`,
    });

    await this.publishMaintenanceEvent(asset.organizationId, record, principal?.userId ?? null);

    return buildSuccessResponse(
      'Asset maintenance record created successfully.',
      toAssetMaintenanceRecordResponse(record),
    );
  }

  async updateMaintenanceRecord(
    maintenanceId: string,
    dto: UpdateAssetMaintenanceRecordDto,
    principal?: CurrentPrincipal,
  ) {
    const existing = await this.assetsRepository.findMaintenanceRecordById(maintenanceId);
    if (!existing) {
      throw new NotFoundException('Asset maintenance record not found.');
    }

    this.assetsPolicyService.assertCanManageMaintenance(principal, existing.organizationId);

    const record = await this.assetsRepository.updateMaintenanceRecord(maintenanceId, {
      ...(dto.organizationId ? { organization: { connect: { id: dto.organizationId } } } : {}),
      ...(dto.maintenanceType !== undefined ? { maintenanceType: dto.maintenanceType } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.scheduledAt !== undefined
        ? { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null }
        : {}),
      ...(dto.startedAt !== undefined
        ? { startedAt: dto.startedAt ? new Date(dto.startedAt) : null }
        : {}),
      ...(dto.completedAt !== undefined
        ? { completedAt: dto.completedAt ? new Date(dto.completedAt) : null }
        : {}),
      ...(dto.performedByWorkforceMemberId !== undefined
        ? dto.performedByWorkforceMemberId
          ? { performedByWorkforceMember: { connect: { id: dto.performedByWorkforceMemberId } } }
          : { performedByWorkforceMember: { disconnect: true } }
        : {}),
      ...(dto.vendorName !== undefined ? { vendorName: dto.vendorName } : {}),
      ...(dto.costAmount !== undefined
        ? { costAmount: dto.costAmount ? new Prisma.Decimal(dto.costAmount) : null }
        : {}),
      ...(dto.currencyCode !== undefined ? { currencyCode: dto.currencyCode } : {}),
      ...(dto.metadata !== undefined
        ? {
            metadata:
              dto.metadata === null
                ? Prisma.JsonNull
                : (dto.metadata as Prisma.InputJsonValue),
          }
        : {}),
    });

    await this.auditService.record({
      action: 'asset.maintenance.update',
      entityType: 'asset-maintenance-record',
      entityId: record.id,
      organizationId: record.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Updated maintenance record ${record.id}.`,
      metadata: {
        changedFields: Object.keys(dto),
      },
    });

    await this.publishMaintenanceEvent(record.organizationId, record, principal?.userId ?? null);

    return buildSuccessResponse(
      'Asset maintenance record updated successfully.',
      toAssetMaintenanceRecordResponse(record),
    );
  }

  async listMaintenanceRecords(assetId: string, principal?: CurrentPrincipal) {
    const asset = await this.assetsRepository.findAssetById(assetId);
    if (!asset) {
      throw new NotFoundException('Asset not found.');
    }

    this.assetsPolicyService.assertCanView(principal, asset.organizationId);
    const records = await this.assetsRepository.listMaintenanceRecords(assetId);

    return buildSuccessResponse(
      'Asset maintenance records retrieved successfully.',
      records.map((item) => toAssetMaintenanceRecordResponse(item)),
    );
  }

  private async publishMaintenanceEvent(
    organizationId: string,
    record: Awaited<ReturnType<AssetsRepository['createMaintenanceRecord']>>,
    triggeredByUserId: string | null,
  ) {
    const payload: AssetMaintenanceEventPayload = {
      maintenanceId: record.id,
      assetId: record.assetId,
      organizationId,
      maintenanceType: record.maintenanceType,
      status: record.status,
      scheduledAt: record.scheduledAt?.toISOString() ?? null,
      startedAt: record.startedAt?.toISOString() ?? null,
      completedAt: record.completedAt?.toISOString() ?? null,
    };

    const eventType = this.resolveMaintenanceEventType(record.status);
    if (!eventType) {
      return;
    }

    await this.domainEventsService.publish({
      organizationId,
      eventType,
      aggregateType: 'asset-maintenance-record',
      aggregateId: record.id,
      triggeredByUserId,
      payload,
    });
  }

  private resolveMaintenanceEventType(status: AssetMaintenanceStatus) {
    switch (status) {
      case AssetMaintenanceStatus.SCHEDULED:
        return AssetEvents.maintenanceScheduled;
      case AssetMaintenanceStatus.IN_PROGRESS:
        return AssetEvents.maintenanceStarted;
      case AssetMaintenanceStatus.COMPLETED:
        return AssetEvents.maintenanceCompleted;
      default:
        return null;
    }
  }
}
