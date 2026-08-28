import {
  AssetMaintenanceStatus,
  AssetMaintenanceType,
  AssetStatusCategory,
  AssetType,
} from '@prisma/client';

import { DomainEventPayload } from '../../events/domain-events.types';

export const AssetEvents = {
  created: 'asset.created',
  updated: 'asset.updated',
  statusChanged: 'asset.status_changed',
  maintenanceScheduled: 'asset.maintenance_scheduled',
  maintenanceStarted: 'asset.maintenance_started',
  maintenanceCompleted: 'asset.maintenance_completed',
  complianceExpiringSoon: 'asset.compliance_expiring_soon',
} as const;

export interface AssetCreatedEventPayload extends DomainEventPayload {
  assetId: string;
  organizationId: string;
  assetCode: string;
  assetType: AssetType;
}

export interface AssetUpdatedEventPayload extends DomainEventPayload {
  assetId: string;
  organizationId: string;
  changedFields: string[];
}

export interface AssetStatusChangedEventPayload extends DomainEventPayload {
  assetId: string;
  organizationId: string;
  category: AssetStatusCategory;
  previousValue: string;
  nextValue: string;
  reason?: string | null;
  changedByUserId?: string | null;
}

export interface AssetMaintenanceEventPayload extends DomainEventPayload {
  maintenanceId: string;
  assetId: string;
  organizationId: string;
  maintenanceType: AssetMaintenanceType;
  status: AssetMaintenanceStatus;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface AssetComplianceExpiringSoonEventPayload extends DomainEventPayload {
  assetId: string;
  organizationId: string;
  complianceStatus: string;
  expiresAt: string;
  daysRemaining: number;
}
