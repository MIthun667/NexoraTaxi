import { ResourceAssignment } from '@prisma/client';

export const RESOURCE_ASSIGNMENT_SELECT = {
  id: true,
  organizationId: true,
  assignmentType: true,
  status: true,
  workforceMemberId: true,
  assetId: true,
  shiftId: true,
  workOrderId: true,
  zoneId: true,
  assignedByUserId: true,
  assignedAt: true,
  releasedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ResourceAssignmentResponse = ResourceAssignment;
export const toResourceAssignmentResponse = (
  assignment: ResourceAssignmentResponse,
): ResourceAssignmentResponse => assignment;
