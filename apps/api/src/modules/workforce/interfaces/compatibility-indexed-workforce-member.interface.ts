import {
  WorkforceAvailabilityStatus,
  WorkforceComplianceStatus,
  WorkforceEmploymentModel,
  WorkforceMemberType,
  WorkforceOperationalStatus,
} from '@prisma/client';

export interface CompatibilityIndexedWorkforceMemberInput {
  id: string;
  organizationId: string;
  employeeId?: string;
  userId?: string;
  workerCode: string;
  workerType: WorkforceMemberType;
  employmentModel?: WorkforceEmploymentModel;
  firstName: string;
  lastName: string;
  displayName?: string;
  workEmail?: string;
  phoneNumber?: string;
  operationalStatus?: WorkforceOperationalStatus;
  complianceStatus?: WorkforceComplianceStatus;
  availabilityStatus?: WorkforceAvailabilityStatus;
  metadata?: Record<string, unknown>;
}
