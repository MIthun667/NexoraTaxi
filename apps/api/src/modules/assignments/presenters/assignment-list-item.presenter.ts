import {
  AssignmentType,
  ResourceAssignmentStatus,
} from '@prisma/client';

export interface AssignmentListItemPresenter {
  id: string;
  organizationId: string;
  assignmentType: AssignmentType;
  status: ResourceAssignmentStatus;
  workforceMemberId: string | null;
  assetId: string | null;
  shiftId: string | null;
  workOrderId: string | null;
  zoneId: string | null;
  assignedByUserId: string | null;
  assignedAt: Date;
  releasedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
