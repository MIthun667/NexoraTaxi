import { Prisma } from '@prisma/client';

import { deterministicUuid } from '../seed/utils';
import {
  INCIDENT_TARGET,
  INCIDENT_TYPES,
  addDays,
  defaultOccurredAt,
  incidentActionTypes,
  incidentSeverityDistribution,
  operationalIncidentStatuses,
} from './helpers';
import type { CoreSeedContext, IncidentSeedResult } from './types';

export const seedIncidents = async (
  context: CoreSeedContext & {
    zoneIds: string[];
    workOrderIds: string[];
    workforceIds: string[];
    assetIds: string[];
  },
): Promise<IncidentSeedResult> => {
  const { prisma, organizationId, users, zoneIds, workOrderIds, workforceIds, assetIds } = context;
  const incidents = Array.from({ length: INCIDENT_TARGET }, (_, index) => {
    const status = operationalIncidentStatuses[index % operationalIncidentStatuses.length];
    const reportedAt = defaultOccurredAt(index);

    return {
      id: deterministicUuid(`incident:${index + 1}`),
      organizationId,
      incidentCode: `INC-${String(index + 1).padStart(4, '0')}`,
      incidentType: INCIDENT_TYPES[index % INCIDENT_TYPES.length],
      title: `${INCIDENT_TYPES[index % INCIDENT_TYPES.length].replace(/_/g, ' ')} incident ${index + 1}`,
      description: 'Seeded operational incident to support monitoring, verification, and AI risk analysis.',
      severity: incidentSeverityDistribution[index],
      status,
      zoneId: zoneIds[index % zoneIds.length] ?? null,
      workOrderId: index % 5 === 0 ? null : workOrderIds[index % workOrderIds.length] ?? null,
      workforceMemberId: index % 3 === 0 ? workforceIds[index % workforceIds.length] ?? null : null,
      assetId: index % 2 === 0 ? assetIds[index % assetIds.length] ?? null : null,
      relatedEntityType: index % 4 === 0 ? 'work-order' : index % 4 === 1 ? 'asset' : 'schedule-shift',
      relatedEntityId:
        index % 4 === 0
          ? workOrderIds[index % workOrderIds.length] ?? null
          : index % 4 === 1
            ? assetIds[index % assetIds.length] ?? null
            : zoneIds[index % zoneIds.length] ?? null,
      reportedByUserId: users[index % users.length]?.id ?? null,
      assignedToUserId: users[(index + 3) % users.length]?.id ?? null,
      reportedAt,
      resolvedAt: status === 'RESOLVED' ? addDays(reportedAt, 2 + (index % 4)) : null,
      metadata: {
        seeded: true,
        detectedBy: index % 2 === 0 ? 'monitoring' : 'operator',
      } as Prisma.InputJsonValue,
      createdAt: reportedAt,
      updatedAt: addDays(reportedAt, 1),
    };
  });

  await prisma.operationalIncident.createMany({ data: incidents });

  const actions = incidents.flatMap((incident, index) => {
    const base = [
      {
        id: deterministicUuid(`incident-action:${incident.id}:comment`),
        organizationId,
        incidentId: incident.id,
        actionType: incidentActionTypes[index % incidentActionTypes.length],
        summary: `Initial triage recorded for ${incident.incidentCode}`,
        performedByUserId: users[index % users.length]?.id ?? null,
        performedAt: incident.reportedAt,
        metadata: { seeded: true } as Prisma.InputJsonValue,
        createdAt: incident.reportedAt,
        updatedAt: incident.reportedAt,
      },
    ];

    if (incident.status === 'RESOLVED' || incident.status === 'IN_PROGRESS') {
      base.push({
        id: deterministicUuid(`incident-action:${incident.id}:followup`),
        organizationId,
        incidentId: incident.id,
        actionType: incident.status === 'RESOLVED' ? 'RESOLVE' : 'MITIGATE',
        summary:
          incident.status === 'RESOLVED'
            ? `Incident ${incident.incidentCode} closed after mitigation`
            : `Mitigation in progress for ${incident.incidentCode}`,
        performedByUserId: users[(index + 2) % users.length]?.id ?? null,
        performedAt: addDays(incident.reportedAt, 1),
        metadata: { seeded: true } as Prisma.InputJsonValue,
        createdAt: addDays(incident.reportedAt, 1),
        updatedAt: addDays(incident.reportedAt, 1),
      });
    }

    return base;
  });

  await prisma.incidentAction.createMany({ data: actions });

  return {
    incidents,
    incidentActions: actions.length,
  };
};
