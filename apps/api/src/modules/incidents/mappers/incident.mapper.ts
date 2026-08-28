import { IncidentAction, OperationalIncident } from '@prisma/client';

export const OPERATIONAL_INCIDENT_SELECT = {
  id: true,
  organizationId: true,
  incidentCode: true,
  incidentType: true,
  title: true,
  description: true,
  severity: true,
  status: true,
  zoneId: true,
  workOrderId: true,
  workforceMemberId: true,
  assetId: true,
  relatedEntityType: true,
  relatedEntityId: true,
  reportedByUserId: true,
  assignedToUserId: true,
  reportedAt: true,
  resolvedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const INCIDENT_ACTION_SELECT = {
  id: true,
  organizationId: true,
  incidentId: true,
  actionType: true,
  summary: true,
  performedByUserId: true,
  performedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type OperationalIncidentResponse = OperationalIncident;
export type IncidentActionResponse = IncidentAction;

export const toOperationalIncidentResponse = (
  incident: OperationalIncidentResponse,
): OperationalIncidentResponse => incident;
export const toIncidentActionResponse = (
  action: IncidentActionResponse,
): IncidentActionResponse => action;
