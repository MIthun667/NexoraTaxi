import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OperationalIncidentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
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
import { CreateIncidentActionDto } from './dto/create-incident-action.dto';
import { CreateOperationalIncidentDto } from './dto/create-operational-incident.dto';
import { QueryOperationalIncidentsDto } from './dto/query-operational-incidents.dto';
import { ResolveIncidentDto } from './dto/resolve-incident.dto';
import { UpdateOperationalIncidentDto } from './dto/update-operational-incident.dto';
import {
  INCIDENT_ACTION_SELECT,
  OPERATIONAL_INCIDENT_SELECT,
  toIncidentActionResponse,
  toOperationalIncidentResponse,
} from './mappers/incident.mapper';

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async create(reportedByUserId: string | undefined, dto: CreateOperationalIncidentDto) {
    const incident = await this.prismaService.operationalIncident.create({
      data: {
        ...dto,
        reportedByUserId: reportedByUserId ?? null,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
      select: OPERATIONAL_INCIDENT_SELECT,
    });
    await this.domainEventsService.publish({
      organizationId: incident.organizationId,
      eventType: 'incident.reported',
      aggregateType: 'operational-incident',
      aggregateId: incident.id,
      triggeredByUserId: reportedByUserId ?? null,
    });
    return buildSuccessResponse('Operational incident created successfully.', toOperationalIncidentResponse(incident));
  }

  async findAll(query: QueryOperationalIncidentsDto) {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();
    const where: Prisma.OperationalIncidentWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.workOrderId ? { workOrderId: query.workOrderId } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { incidentCode: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
              { incidentType: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.operationalIncident.findMany({
        where,
        select: OPERATIONAL_INCIDENT_SELECT,
        orderBy: [{ reportedAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.operationalIncident.count({ where }),
    ]);
    return buildPaginatedResponse(
      'Operational incidents retrieved successfully.',
      items.map((item) => toOperationalIncidentResponse(item)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async findOne(id: string) {
    const incident = await this.findIncidentById(id);
    return buildSuccessResponse('Operational incident retrieved successfully.', toOperationalIncidentResponse(incident));
  }

  async update(id: string, dto: UpdateOperationalIncidentDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one incident field must be provided.');
    }
    await this.findIncidentById(id);
    const incident = await this.prismaService.operationalIncident.update({
      where: { id },
      data: {
        ...dto,
        resolvedAt: dto.resolvedAt === undefined ? undefined : dto.resolvedAt ? new Date(dto.resolvedAt) : null,
        metadata:
          dto.metadata === undefined
            ? undefined
            : dto.metadata === null
              ? Prisma.JsonNull
              : (dto.metadata as Prisma.InputJsonValue),
      },
      select: OPERATIONAL_INCIDENT_SELECT,
    });
    return buildSuccessResponse('Operational incident updated successfully.', toOperationalIncidentResponse(incident));
  }

  async addAction(id: string, performedByUserId: string | undefined, dto: CreateIncidentActionDto) {
    const incident = await this.findIncidentById(id);
    const action = await this.prismaService.incidentAction.create({
      data: {
        organizationId: incident.organizationId,
        incidentId: id,
        actionType: dto.actionType,
        summary: dto.summary,
        performedByUserId: performedByUserId ?? null,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
      select: INCIDENT_ACTION_SELECT,
    });
    return buildSuccessResponse('Incident action recorded successfully.', toIncidentActionResponse(action));
  }

  async resolve(id: string, actorUserId: string | undefined, dto: ResolveIncidentDto) {
    const incident = await this.findIncidentById(id);
    const updated = await this.prismaService.operationalIncident.update({
      where: { id },
      data: {
        status: OperationalIncidentStatus.RESOLVED,
        resolvedAt: new Date(),
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
      select: OPERATIONAL_INCIDENT_SELECT,
    });
    await this.auditService.record({
      action: 'incident.resolve',
      entityType: 'operational-incident',
      entityId: updated.id,
      organizationId: updated.organizationId,
      actorUserId: actorUserId ?? null,
      summary: dto.summary ?? `Resolved incident ${incident.incidentCode}.`,
    });
    return buildSuccessResponse('Operational incident resolved successfully.', toOperationalIncidentResponse(updated));
  }

  private async findIncidentById(id: string) {
    const incident = await this.prismaService.operationalIncident.findUnique({
      where: { id },
      select: OPERATIONAL_INCIDENT_SELECT,
    });
    if (!incident) {
      throw new NotFoundException('Operational incident not found.');
    }
    return incident;
  }
}
