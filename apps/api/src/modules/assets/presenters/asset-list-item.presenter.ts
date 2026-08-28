import {
  AssetAvailabilityStatus,
  AssetComplianceStatus,
  AssetOperationalStatus,
  AssetType,
} from '@prisma/client';

export interface AssetListItemPresenter {
  id: string;
  organizationId: string;
  assetCode: string;
  assetType: AssetType;
  assetClass: string | null;
  name: string;
  serialNumber: string | null;
  registrationNumber: string | null;
  operationalStatus: AssetOperationalStatus;
  complianceStatus: AssetComplianceStatus;
  availabilityStatus: AssetAvailabilityStatus;
  zoneId: string | null;
  ownerOrganizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
