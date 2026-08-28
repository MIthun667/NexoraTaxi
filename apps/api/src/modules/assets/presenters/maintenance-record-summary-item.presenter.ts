import {
  AssetMaintenanceStatus,
  AssetMaintenanceType,
  WorkOrderPriority,
} from '@prisma/client';

export interface MaintenanceRecordSummaryItemPresenter {
  id: string;
  assetId: string;
  organizationId: string;
  maintenanceType: AssetMaintenanceType;
  title: string;
  description: string | null;
  status: AssetMaintenanceStatus;
  priority: WorkOrderPriority;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  performedByWorkforceMemberId: string | null;
  vendorName: string | null;
  costAmount: unknown;
  currencyCode: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}
