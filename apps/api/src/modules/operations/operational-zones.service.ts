import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { CreateOperationalZoneDto } from './dto/create-operational-zone.dto';
import { ListOperationalZonesQueryDto } from './dto/list-operational-zones-query.dto';
import { UpdateOperationalZoneDto } from './dto/update-operational-zone.dto';
import {
  OperationalZoneCreatedEventPayload,
  OperationalZoneUpdatedEventPayload,
  OperationsEvents,
} from './events/operations.events';
import { buildOperationalZonesWhere } from './mappers/operational-zones-where.builder';
import { toOperationalZoneResponse } from './mappers/operations.mapper';
import { OperationalZonesRepository } from './operational-zones.repository';
import { OperationsPolicyService } from './policies/operations-policy.service';
import { OperationalZoneDetailPresenter } from './presenters/operational-zone-detail.presenter';

@Injectable()
export class OperationalZonesService {
  constructor(
    private readonly operationalZonesRepository: OperationalZonesRepository,
    private readonly operationsPolicyService: OperationsPolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async createZone(dto: CreateOperationalZoneDto) {
    const zone = await this.operationalZonesRepository.createZone({
      organization: { connect: { id: dto.organizationId } },
      ...(dto.parentZoneId ? { parentZone: { connect: { id: dto.parentZoneId } } } : {}),
      zoneCode: dto.zoneCode,
      name: dto.name,
      zoneType: dto.zoneType,
      description: dto.description,
      coverageDefinition: dto.coverageDefinition as Prisma.InputJsonValue | undefined,
      isActive: dto.isActive,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.record({
      action: 'operational-zone.create',
      entityType: 'operational-zone',
      entityId: zone.id,
      organizationId: zone.organizationId,
      summary: `Created operational zone ${zone.zoneCode}.`,
    });

    const payload: OperationalZoneCreatedEventPayload = {
      operationalZoneId: zone.id,
      organizationId: zone.organizationId,
      zoneCode: zone.zoneCode,
      zoneType: zone.zoneType,
      parentZoneId: zone.parentZoneId,
    };

    await this.domainEventsService.publish({
      organizationId: zone.organizationId,
      eventType: OperationsEvents.zoneCreated,
      aggregateType: 'operational-zone',
      aggregateId: zone.id,
      payload,
    });

    return buildSuccessResponse(
      'Operational zone created successfully.',
      toOperationalZoneResponse(zone),
    );
  }

  async listZones(query: ListOperationalZonesQueryDto, principal?: CurrentPrincipal) {
    const { page, limit, skip } = resolvePagination(query);
    const where = buildOperationalZonesWhere(query, principal);
    const [items, total] = await Promise.all([
      this.operationalZonesRepository.listZones(where, skip, limit),
      this.operationalZonesRepository.countZones(where),
    ]);

    return buildPaginatedResponse(
      'Operational zones retrieved successfully.',
      items.map((item) => toOperationalZoneResponse(item)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getZoneDetail(id: string, principal?: CurrentPrincipal) {
    const zone = await this.operationalZonesRepository.findZoneWithRelations(id);
    if (!zone) {
      throw new NotFoundException('Operational zone not found.');
    }

    this.operationsPolicyService.assertCanViewZones(principal, zone.organizationId);

    const detail: OperationalZoneDetailPresenter = {
      ...toOperationalZoneResponse(zone),
      coverageDefinition: zone.coverageDefinition,
      metadata: zone.metadata,
      childZones: zone.childZones.map((item) => toOperationalZoneResponse(item)),
    };

    return buildSuccessResponse('Operational zone retrieved successfully.', detail);
  }

  async updateZone(id: string, dto: UpdateOperationalZoneDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one operational zone field must be provided.');
    }

    const existing = await this.findZoneById(id);
    const zone = await this.operationalZonesRepository.updateZone(id, {
      ...(dto.organizationId ? { organization: { connect: { id: dto.organizationId } } } : {}),
      ...(dto.parentZoneId !== undefined
        ? dto.parentZoneId
          ? { parentZone: { connect: { id: dto.parentZoneId } } }
          : { parentZone: { disconnect: true } }
        : {}),
      ...(dto.zoneCode !== undefined ? { zoneCode: dto.zoneCode } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.zoneType !== undefined ? { zoneType: dto.zoneType } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.coverageDefinition !== undefined
        ? {
            coverageDefinition:
              dto.coverageDefinition === null
                ? Prisma.JsonNull
                : (dto.coverageDefinition as Prisma.InputJsonValue),
          }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.metadata !== undefined
        ? {
            metadata:
              dto.metadata === null ? Prisma.JsonNull : (dto.metadata as Prisma.InputJsonValue),
          }
        : {}),
    });

    await this.auditService.record({
      action: 'operational-zone.update',
      entityType: 'operational-zone',
      entityId: zone.id,
      organizationId: zone.organizationId,
      summary: `Updated operational zone ${zone.zoneCode}.`,
    });

    const payload: OperationalZoneUpdatedEventPayload = {
      operationalZoneId: zone.id,
      organizationId: zone.organizationId,
      changedFields: Object.keys(dto),
    };

    await this.domainEventsService.publish({
      organizationId: zone.organizationId,
      eventType: OperationsEvents.zoneUpdated,
      aggregateType: 'operational-zone',
      aggregateId: zone.id,
      payload,
    });

    return buildSuccessResponse(
      'Operational zone updated successfully.',
      toOperationalZoneResponse(zone),
    );
  }

  private async findZoneById(id: string) {
    const zone = await this.operationalZonesRepository.findZoneById(id);
    if (!zone) {
      throw new NotFoundException('Operational zone not found.');
    }
    return zone;
  }
}
