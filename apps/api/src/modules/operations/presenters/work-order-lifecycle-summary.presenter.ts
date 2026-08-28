import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';

export interface WorkOrderLifecycleSummaryPresenter {
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  requestedAt: Date;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  isBlocked: boolean;
  isCompleted: boolean;
}
