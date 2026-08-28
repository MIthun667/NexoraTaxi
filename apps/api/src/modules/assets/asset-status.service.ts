import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatusCategory, Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import {
  AssetEvents,
  AssetStatusChangedEventPayload,
} from './events/assets.events';
import { toAssetStatusHistoryResponse } from './mappers/asset.mapper';
import { AssetsPolicyService } from './policies/assets-policy.service';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto';
import { AssetsRepository } from './assets.repository';

@Injectable()
export class AssetStatusService {
  constructor(
    private readonly assetsRepository: AssetsRepository,
    private readonly assetsPolicyService: AssetsPolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async updateStatus(id: string, dto: UpdateAssetStatusDto, principal?: CurrentPrincipal) {
    const asset = await this.assetsRepository.findAssetById(id);
    if (!asset) {
      throw new NotFoundException('Asset not found.');
    }

    this.assetsPolicyService.assertCanChangeStatus(principal, asset.organizationId);

    const previousValue = this.resolveCurrentStatusValue(asset, dto.category);

    const history = await this.assetsRepository.runInTransaction(async (tx) => {
      await this.assetsRepository.updateAssetStatus(tx, id, dto.category, dto.nextValue);

      return tx.assetStatusHistory.create({
        data: {
          organizationId: asset.organizationId,
          assetId: id,
          category: dto.category,
          previousValue,
          nextValue: dto.nextValue,
          reason: dto.reason,
          changedByUserId: principal?.userId ?? null,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        },
        select: {
          id: true,
          organizationId: true,
          assetId: true,
          category: true,
          previousValue: true,
          nextValue: true,
          reason: true,
          changedByUserId: true,
          effectiveAt: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    await this.auditService.record({
      action: 'asset.status.update',
      entityType: 'asset',
      entityId: id,
      organizationId: asset.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Updated ${dto.category.toLowerCase()} for asset ${asset.assetCode}.`,
      metadata: {
        previousValue,
        nextValue: dto.nextValue,
        reason: dto.reason ?? null,
      },
    });

    const payload: AssetStatusChangedEventPayload = {
      assetId: id,
      organizationId: asset.organizationId,
      category: dto.category,
      previousValue,
      nextValue: dto.nextValue,
      reason: dto.reason ?? null,
      changedByUserId: principal?.userId ?? null,
    };

    await this.domainEventsService.publish({
      organizationId: asset.organizationId,
      eventType: AssetEvents.statusChanged,
      aggregateType: 'asset',
      aggregateId: id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Asset status updated successfully.',
      toAssetStatusHistoryResponse(history),
    );
  }

  private resolveCurrentStatusValue(
    asset: NonNullable<Awaited<ReturnType<AssetsRepository['findAssetById']>>>,
    category: AssetStatusCategory,
  ) {
    if (category === AssetStatusCategory.OPERATIONAL_STATUS) {
      return asset.operationalStatus;
    }

    if (category === AssetStatusCategory.COMPLIANCE_STATUS) {
      return asset.complianceStatus;
    }

    return asset.availabilityStatus;
  }
}
