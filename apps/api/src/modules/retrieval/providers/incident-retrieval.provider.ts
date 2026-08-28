import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { RetrievalContext, RetrievalProvider, RetrievalProviderResult } from '../retrieval.types';

@Injectable()
export class IncidentRetrievalProvider implements RetrievalProvider {
  readonly name = 'incidents';

  constructor(private readonly prismaService: PrismaService) {}

  supports(request: RetrievalContext['request']): boolean {
    return request.targetEntityType === 'operational-incident';
  }

  async retrieve(context: RetrievalContext): Promise<RetrievalProviderResult> {
    const { organizationId, targetEntityId, maxRecords, includeRelated, timeWindow } = context.request;

    if (!targetEntityId) {
      return { contextNotes: ['Incident retrieval skipped because targetEntityId was not provided.'] };
    }

    const incident = await this.prismaService.operationalIncident.findFirst({
      where: { id: targetEntityId, organizationId },
      include: {
        actions: { orderBy: [{ performedAt: 'desc' }], take: maxRecords },
        workOrder: includeRelated ? true : false,
        asset: includeRelated ? true : false,
        workforceMember: includeRelated ? true : false,
      },
    });

    if (!incident) {
      return { contextNotes: ['No incident was found for the requested scope.'] };
    }

    const relatedHistory = await this.prismaService.operationalIncident.findMany({
      where: {
        organizationId,
        id: { not: incident.id },
        incidentType: incident.incidentType,
        reportedAt: {
          gte: timeWindow?.from,
          lte: timeWindow?.to,
        },
      },
      orderBy: [{ reportedAt: 'desc' }],
      take: maxRecords,
      select: {
        id: true,
        incidentCode: true,
        status: true,
        severity: true,
        reportedAt: true,
      },
    });

    return {
      entitySnapshot: {
        id: incident.id,
        incidentCode: incident.incidentCode,
        incidentType: incident.incidentType,
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        zoneId: incident.zoneId,
        workOrderId: incident.workOrderId,
        reportedAt: incident.reportedAt,
        resolvedAt: incident.resolvedAt,
      },
      relatedEntities: [
        ...(incident.workOrder ? [{ entityType: 'work-order', id: incident.workOrder.id, title: incident.workOrder.title, status: incident.workOrder.status }] : []),
        ...(incident.asset ? [{ entityType: 'asset', id: incident.asset.id, name: incident.asset.name, operationalStatus: incident.asset.operationalStatus }] : []),
        ...(incident.workforceMember ? [{ entityType: 'workforce-member', id: incident.workforceMember.id, displayName: incident.workforceMember.displayName, operationalStatus: incident.workforceMember.operationalStatus }] : []),
        ...relatedHistory.map((item) => ({ entityType: 'operational-incident', id: item.id, incidentCode: item.incidentCode, status: item.status, severity: item.severity })),
      ],
      timelineEvents: incident.actions.map((action) => ({
        eventType: 'incident_action',
        actionType: action.actionType,
        summary: action.summary,
        performedAt: action.performedAt,
      })),
      operationalMetrics: [
        { key: 'similar_incidents_window', label: 'Similar incidents in time window', value: relatedHistory.length },
        { key: 'action_count', label: 'Recorded incident actions', value: incident.actions.length },
      ],
      riskSignals: [
        ...(['HIGH', 'CRITICAL'].includes(incident.severity)
          ? [{ code: 'INCIDENT_SEVERITY_HIGH', severity: incident.severity === 'CRITICAL' ? 'CRITICAL' as const : 'HIGH' as const, message: 'Incident severity is high or critical.' }]
          : []),
      ],
    };
  }
}
