import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../notifications/domain-events.service';

@Injectable()
export class IncidentMonitorService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async createReliabilityIncident(params: {
    organizationId?: string | null;
    sourceModule: string;
    incidentType: string;
    title: string;
    description: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    if (!params.organizationId) {
      return null;
    }

    const existing = await this.prismaService.operationalIncident.findFirst({
      where: {
        organizationId: params.organizationId,
        incidentType: params.incidentType,
        title: params.title,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      select: { id: true },
    });

    if (existing) {
      return existing;
    }

    const count = await this.prismaService.operationalIncident.count({
      where: { organizationId: params.organizationId },
    });
    const incidentCode = `REL-${String(count + 1).padStart(4, '0')}`;

    const incident = await this.prismaService.operationalIncident.create({
      data: {
        organizationId: params.organizationId,
        incidentCode,
        incidentType: params.incidentType,
        title: params.title,
        description: params.description,
        severity: params.severity ?? 'HIGH',
        status: 'OPEN',
        relatedEntityType: params.relatedEntityType ?? 'system',
        relatedEntityId: params.relatedEntityId ?? null,
        metadata: {
          sourceModule: params.sourceModule,
          ...(params.metadata ?? {}),
        } as Prisma.InputJsonValue,
      },
      select: { id: true, organizationId: true },
    });

    await this.domainEventsService.publish({
      organizationId: incident.organizationId,
      eventType: 'incident.reported',
      aggregateType: 'operational-incident',
      aggregateId: incident.id,
      sourceModule: 'observability',
      payload: {
        incidentType: params.incidentType,
        title: params.title,
        sourceModule: params.sourceModule,
      },
    });

    return incident;
  }
}
