import { Injectable, NotFoundException } from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import { buildAssetsListWhere } from './mappers/assets-where.builder';
import {
  toAssetMaintenanceRecordResponse,
  toAssetResponse,
  toAssetStatusHistoryResponse,
} from './mappers/asset.mapper';
import { ListAssetsQueryDto } from './dto/list-assets-query.dto';
import { AssetsPolicyService } from './policies/assets-policy.service';
import { AssetsRepository } from './assets.repository';
import { AssetDetailPresenter } from './presenters/asset-detail.presenter';

@Injectable()
export class AssetsQueryService {
  constructor(
    private readonly assetsRepository: AssetsRepository,
    private readonly assetsPolicyService: AssetsPolicyService,
  ) {}

  async listAssets(query: ListAssetsQueryDto, principal?: CurrentPrincipal) {
    const { page, limit, skip } = resolvePagination(query);
    const where = buildAssetsListWhere(query, principal);
    const [items, total] = await Promise.all([
      this.assetsRepository.listAssets(where, skip, limit),
      this.assetsRepository.countAssets(where),
    ]);

    return buildPaginatedResponse(
      'Assets retrieved successfully.',
      items.map((item) => toAssetResponse(item)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getAssetDetail(id: string, principal?: CurrentPrincipal) {
    const asset = await this.assetsRepository.findAssetWithRelations(id);
    if (!asset) {
      throw new NotFoundException('Asset not found.');
    }

    this.assetsPolicyService.assertCanView(principal, asset.organizationId);

    const detail: AssetDetailPresenter = {
      ...toAssetResponse(asset),
      specifications: asset.specifications,
      metadata: asset.metadata,
      maintenanceSummary: asset.maintenanceRecords.map((item) =>
        toAssetMaintenanceRecordResponse(item),
      ),
      latestStatusChanges: asset.statusHistory.map((item) =>
        toAssetStatusHistoryResponse(item),
      ),
      readiness: {
        isOperationallyReady:
          asset.operationalStatus === 'ACTIVE' &&
          asset.complianceStatus === 'COMPLIANT' &&
          asset.availabilityStatus === 'AVAILABLE',
        blockingIssues: [
          ...(asset.operationalStatus !== 'ACTIVE'
            ? [`Operational status is ${asset.operationalStatus.toLowerCase()}.`]
            : []),
          ...(asset.complianceStatus !== 'COMPLIANT'
            ? [`Compliance status is ${asset.complianceStatus.toLowerCase()}.`]
            : []),
          ...(asset.availabilityStatus !== 'AVAILABLE'
            ? [`Availability status is ${asset.availabilityStatus.toLowerCase()}.`]
            : []),
        ],
      },
    };

    return buildSuccessResponse('Asset retrieved successfully.', detail);
  }

  async getAssetHistory(id: string, principal?: CurrentPrincipal) {
    const asset = await this.assetsRepository.findAssetById(id);
    if (!asset) {
      throw new NotFoundException('Asset not found.');
    }

    this.assetsPolicyService.assertCanView(principal, asset.organizationId);
    const history = await this.assetsRepository.listStatusHistory(id);

    return buildSuccessResponse(
      'Asset history retrieved successfully.',
      history.map((item) => toAssetStatusHistoryResponse(item)),
    );
  }

  async getAssetReadinessSummary(organizationId: string) {
    const [activeCount, compliantCount, availableCount, maintenanceAttentionCount] =
      await this.assetsRepository.getReadinessCounts(organizationId);

    return buildSuccessResponse('Asset readiness summary retrieved successfully.', {
      organizationId,
      activeCount,
      compliantCount,
      availableCount,
      maintenanceAttentionCount,
      generatedAt: new Date().toISOString(),
    });
  }
}
