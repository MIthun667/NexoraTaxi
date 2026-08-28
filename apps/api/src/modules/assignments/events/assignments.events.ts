import {
  AssignmentType,
  ResourceAssignmentStatus,
} from '@prisma/client';

import { DomainEventPayload } from '../../events/domain-events.types';

export const AssignmentsEvents = {
  created: 'resource_assignment.created',
  updated: 'resource_assignment.updated',
  statusChanged: 'resource_assignment.status_changed',
  conflictDetected: 'resource_assignment.conflict_detected',
  activated: 'resource_assignment.activated',
  released: 'resource_assignment.released',
  cancelled: 'resource_assignment.cancelled',
} as const;

export interface ResourceAssignmentCreatedEventPayload extends DomainEventPayload {
  resourceAssignmentId: string;
  organizationId: string;
  assignmentType: AssignmentType;
  status: ResourceAssignmentStatus;
  workforceMemberId?: string | null;
  assetId?: string | null;
  shiftId?: string | null;
  workOrderId?: string | null;
}

export interface ResourceAssignmentUpdatedEventPayload extends DomainEventPayload {
  resourceAssignmentId: string;
  organizationId: string;
  changedFields: string[];
}

export interface ResourceAssignmentStatusChangedEventPayload extends DomainEventPayload {
  resourceAssignmentId: string;
  organizationId: string;
  previousStatus: ResourceAssignmentStatus;
  nextStatus: ResourceAssignmentStatus;
  changedByUserId?: string | null;
  reason?: string | null;
}

export interface ResourceAssignmentConflictDetectedEventPayload extends DomainEventPayload {
  organizationId: string;
  assignmentType: AssignmentType;
  workforceMemberId?: string | null;
  assetId?: string | null;
  shiftId?: string | null;
  workOrderId?: string | null;
  conflicts: string[];
}
