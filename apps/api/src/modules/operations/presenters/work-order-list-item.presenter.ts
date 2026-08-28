import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';

export interface WorkOrderListItemPresenter {
  id: string;
  organizationId: string;
  workOrderCode: string;
  title: string;
  description: string | null;
  workType: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  zoneId: string | null;
  createdByUserId: string | null;
  requestedAt: Date;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
