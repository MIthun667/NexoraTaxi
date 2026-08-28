import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { FleetService } from '../fleet/fleet.service';
import { FleetVehicleResponse } from '../fleet/mappers/fleet.mapper';
import { DomainEventsService } from '../notifications/domain-events.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { ListAssetsQueryDto } from './dto/list-assets-query.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Asset } from './interfaces/asset.interface';
import { buildAssetsListWhere } from './mappers/assets-where.builder';
import {
  AssetResponse,
  toAssetResponse,
} from './mappers/asset.mapper';
import {
  AssetCreatedEventPayload,
  AssetEvents,
  AssetUpdatedEventPayload,
} from './events/assets.events';
import { AssetsPolicyService } from './policies/assets-policy.service';
import { AssetsRepository } from './assets.repository';

@Injectable()
export class AssetsService {
  // Canonical contributor-facing asset service. Prefer this surface for new
  // development; FleetService remains available only for rollback-safe legacy
  // compatibility reads and writes that have not yet retired.
  constructor(
    private readonly assetsRepository: AssetsRepository,
    private readonly assetsPolicyService: AssetsPolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
    private readonly fleetService: FleetService,
  ) {}

  async create(dto: CreateAssetDto) {
    const asset = await this.assetsRepository.createAsset({
      organization: { connect: { id: dto.organizationId } },
      ...(dto.zoneId ? { zone: { connect: { id: dto.zoneId } } } : {}),
      ...(dto.ownerOrganizationId
        ? { ownerOrganization: { connect: { id: dto.ownerOrganizationId } } }
        : {}),
      assetCode: dto.assetCode,
      assetType: dto.assetType,
      assetClass: dto.assetClass,
      name: dto.name,
      serialNumber: dto.serialNumber,
      registrationNumber: dto.registrationNumber,
      operationalStatus: dto.operationalStatus,
      complianceStatus: dto.complianceStatus,
      availabilityStatus: dto.availabilityStatus,
      specifications: dto.specifications as Prisma.InputJsonValue | undefined,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.record({
      action: 'asset.create',
      entityType: 'asset',
      entityId: asset.id,
      organizationId: asset.organizationId,
      summary: `Created asset ${asset.assetCode}.`,
    });

    const payload: AssetCreatedEventPayload = {
      assetId: asset.id,
      organizationId: asset.organizationId,
      assetCode: asset.assetCode,
      assetType: asset.assetType,
    };

    await this.domainEventsService.publish({
      organizationId: asset.organizationId,
      eventType: AssetEvents.created,
      aggregateType: 'asset',
      aggregateId: asset.id,
      payload,
    });

    return buildSuccessResponse('Asset created successfully.', toAssetResponse(asset));
  }

  async update(id: string, dto: UpdateAssetDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one asset field must be provided for update.');
    }

    const existing = await this.findActiveAssetById(id);
    this.assetsPolicyService.assertCanUpdate(undefined, existing.organizationId);

    const asset = await this.assetsRepository.updateAsset(id, {
      ...(dto.organizationId ? { organization: { connect: { id: dto.organizationId } } } : {}),
      ...(dto.zoneId !== undefined
        ? dto.zoneId
          ? { zone: { connect: { id: dto.zoneId } } }
          : { zone: { disconnect: true } }
        : {}),
      ...(dto.ownerOrganizationId !== undefined
        ? dto.ownerOrganizationId
          ? { ownerOrganization: { connect: { id: dto.ownerOrganizationId } } }
          : { ownerOrganization: { disconnect: true } }
        : {}),
      ...(dto.assetCode !== undefined ? { assetCode: dto.assetCode } : {}),
      ...(dto.assetType !== undefined ? { assetType: dto.assetType } : {}),
      ...(dto.assetClass !== undefined ? { assetClass: dto.assetClass } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.serialNumber !== undefined ? { serialNumber: dto.serialNumber } : {}),
      ...(dto.registrationNumber !== undefined
        ? { registrationNumber: dto.registrationNumber }
        : {}),
      ...(dto.operationalStatus !== undefined
        ? { operationalStatus: dto.operationalStatus }
        : {}),
      ...(dto.complianceStatus !== undefined ? { complianceStatus: dto.complianceStatus } : {}),
      ...(dto.availabilityStatus !== undefined
        ? { availabilityStatus: dto.availabilityStatus }
        : {}),
      ...(dto.specifications !== undefined
        ? {
            specifications:
              dto.specifications === null
                ? Prisma.JsonNull
                : (dto.specifications as Prisma.InputJsonValue),
          }
        : {}),
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
      action: 'asset.update',
      entityType: 'asset',
      entityId: asset.id,
      organizationId: asset.organizationId,
      summary: `Updated asset ${asset.assetCode}.`,
    });

    const payload: AssetUpdatedEventPayload = {
      assetId: asset.id,
      organizationId: asset.organizationId,
      changedFields: Object.keys(dto),
    };

    await this.domainEventsService.publish({
      organizationId: asset.organizationId,
      eventType: AssetEvents.updated,
      aggregateType: 'asset',
      aggregateId: asset.id,
      payload,
    });

    return buildSuccessResponse('Asset updated successfully.', toAssetResponse(asset));
  }

  async archive(id: string) {
    await this.findActiveAssetById(id);
    const asset = await this.assetsRepository.updateAsset(id, {
      deletedAt: new Date(),
      operationalStatus: 'RETIRED',
      availabilityStatus: 'RESTRICTED',
    });

    await this.auditService.record({
      action: 'asset.archive',
      entityType: 'asset',
      entityId: asset.id,
      organizationId: asset.organizationId,
      summary: `Archived asset ${asset.assetCode}.`,
    });

    return buildSuccessResponse('Asset archived successfully.', toAssetResponse(asset));
  }

  async findOne(id: string) {
    return this.getAssetById(id);
  }

  async listAssets(query: ListAssetsQueryDto) {
    const { page, limit } = resolvePagination(query);
    const where = buildAssetsListWhere(query);
    const [canonicalAssets, canonicalTotal] = await Promise.all([
      this.assetsRepository.listAssets(where, (page - 1) * limit, limit),
      this.assetsRepository.countAssets(where),
    ]);

    if (canonicalTotal > 0) {
      return buildPaginatedResponse(
        'Assets retrieved successfully.',
        canonicalAssets.map((record) => this.mapCanonicalAssetToAsset(record)),
        buildPaginationMeta({
          page,
          limit,
          total: canonicalTotal,
        }),
      );
    }

    const fleetResponse = await this.fleetService.findAllVehicles({
      page,
      limit,
      search: query.search,
      organizationId: query.organizationId,
      operationalStatus: query.operationalStatus as never,
      complianceStatus: query.complianceStatus as never,
      assignmentStatus: query.availabilityStatus as never,
      vehicleClass: query.assetClass as never,
    });

    return buildPaginatedResponse(
      'Assets retrieved successfully.',
      fleetResponse.data.map((record) => this.mapFleetVehicleToAsset(record)),
      buildPaginationMeta({
        page,
        limit,
        total: fleetResponse.meta.total,
      }),
    );
  }

  async getAssetById(assetId: string) {
    const canonicalAsset = await this.assetsRepository.findAssetById(assetId);
    if (canonicalAsset) {
      return buildSuccessResponse(
        'Asset retrieved successfully.',
        this.mapCanonicalAssetToAsset(canonicalAsset),
      );
    }

    const fleetResponse = await this.fleetService.findVehicle(assetId);

    return buildSuccessResponse(
      'Asset retrieved successfully.',
      this.mapFleetVehicleToAsset(fleetResponse.data),
    );
  }

  async addMaintenanceRecord() {
    throw new BadRequestException(
      'Use AssetMaintenanceService for maintenance operations.',
    );
  }

  async listMaintenanceRecords() {
    throw new BadRequestException(
      'Use AssetMaintenanceService for maintenance operations.',
    );
  }

  async updateStatus() {
    throw new BadRequestException(
      'Use AssetStatusService for status transitions.',
    );
  }

  async getStatusHistory() {
    throw new BadRequestException(
      'Use AssetsQueryService for history queries.',
    );
  }

  private async findActiveAssetById(id: string) {
    const asset = await this.assetsRepository.findAssetById(id);
    if (!asset) {
      throw new NotFoundException('Asset not found.');
    }
    return asset;
  }

  private mapCanonicalAssetToAsset(asset: AssetResponse): Asset {
    return {
      id: asset.id,
      organizationId: asset.organizationId,
      displayName: asset.name,
      assetType: asset.assetType.toLowerCase(),
      status: asset.operationalStatus,
      sourceModule: 'assets',
    };
  }

  mapFleetVehicleToAsset(fleetRecord: FleetVehicleResponse): Asset {
    return {
      id: fleetRecord.id,
      organizationId: fleetRecord.organizationId,
      displayName: `${fleetRecord.make} ${fleetRecord.model}`.trim(),
      // TODO: Replace fleet-derived type inference once universal asset persistence
      // and naming become canonical and fleet remains only as a compatibility layer.
      assetType: 'vehicle',
      status: fleetRecord.operationalStatus,
      sourceModule: 'fleet',
    };
  }
}
