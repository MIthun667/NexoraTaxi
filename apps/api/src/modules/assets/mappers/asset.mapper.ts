import { Asset, AssetMaintenanceRecord, AssetStatusHistory } from '@prisma/client';

export const ASSET_SELECT = {
  id: true,
  organizationId: true,
  assetCode: true,
  assetType: true,
  assetClass: true,
  name: true,
  serialNumber: true,
  registrationNumber: true,
  operationalStatus: true,
  complianceStatus: true,
  availabilityStatus: true,
  zoneId: true,
  ownerOrganizationId: true,
  specifications: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const ASSET_MAINTENANCE_SELECT = {
  id: true,
  organizationId: true,
  assetId: true,
  maintenanceType: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  scheduledAt: true,
  startedAt: true,
  completedAt: true,
  performedByWorkforceMemberId: true,
  vendorName: true,
  costAmount: true,
  currencyCode: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const ASSET_STATUS_HISTORY_SELECT = {
  id: true,
  organizationId: true,
  assetId: true,
  category: true,
  previousValue: true,
  nextValue: true,
  reason: true,
  changedByUserId: true,
  effectiveAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type AssetResponse = Pick<
  Asset,
  | 'id'
  | 'organizationId'
  | 'assetCode'
  | 'assetType'
  | 'assetClass'
  | 'name'
  | 'serialNumber'
  | 'registrationNumber'
  | 'operationalStatus'
  | 'complianceStatus'
  | 'availabilityStatus'
  | 'zoneId'
  | 'ownerOrganizationId'
  | 'specifications'
  | 'metadata'
  | 'createdAt'
  | 'updatedAt'
>;

export type AssetMaintenanceRecordResponse = Pick<
  AssetMaintenanceRecord,
  | 'id'
  | 'organizationId'
  | 'assetId'
  | 'maintenanceType'
  | 'title'
  | 'description'
  | 'status'
  | 'priority'
  | 'scheduledAt'
  | 'startedAt'
  | 'completedAt'
  | 'performedByWorkforceMemberId'
  | 'vendorName'
  | 'costAmount'
  | 'currencyCode'
  | 'metadata'
  | 'createdAt'
  | 'updatedAt'
>;

export type AssetStatusHistoryResponse = Pick<
  AssetStatusHistory,
  | 'id'
  | 'organizationId'
  | 'assetId'
  | 'category'
  | 'previousValue'
  | 'nextValue'
  | 'reason'
  | 'changedByUserId'
  | 'effectiveAt'
  | 'metadata'
  | 'createdAt'
  | 'updatedAt'
>;

export const toAssetResponse = (asset: AssetResponse): AssetResponse => asset;
export const toAssetMaintenanceRecordResponse = (
  record: AssetMaintenanceRecordResponse,
): AssetMaintenanceRecordResponse => record;
export const toAssetStatusHistoryResponse = (
  history: AssetStatusHistoryResponse,
): AssetStatusHistoryResponse => history;
