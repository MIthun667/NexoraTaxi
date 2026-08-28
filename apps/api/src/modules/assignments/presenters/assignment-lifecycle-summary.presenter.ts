import { ResourceAssignmentStatus } from '@prisma/client';

export interface AssignmentLifecycleSummaryPresenter {
  status: ResourceAssignmentStatus;
  assignedAt: Date;
  releasedAt: Date | null;
  isActive: boolean;
  isReleased: boolean;
  isCancelled: boolean;
}
