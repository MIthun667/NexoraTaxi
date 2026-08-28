import {
  WorkforceAvailabilityStatus,
  WorkforceComplianceStatus,
  WorkforceMemberType,
  WorkforceOperationalStatus,
} from '@prisma/client';

export interface WorkforceListItemPresenter {
  id: string;
  organizationId: string;
  workerCode: string;
  workerType: WorkforceMemberType;
  displayName: string | null;
  firstName: string;
  lastName: string;
  workEmail: string | null;
  operationalStatus: WorkforceOperationalStatus;
  complianceStatus: WorkforceComplianceStatus;
  availabilityStatus: WorkforceAvailabilityStatus;
  primaryDepartmentId: string | null;
  primaryPositionId: string | null;
  homeZoneId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
