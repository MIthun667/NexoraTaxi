import { Driver, DriverDocument, DriverStatusHistory, Prisma } from '@prisma/client';

export const DRIVER_SELECT = {
  id: true,
  organizationId: true,
  employeeId: true,
  userId: true,
  driverCode: true,
  firstName: true,
  lastName: true,
  workEmail: true,
  phoneNumber: true,
  licenseNumber: true,
  licenseIssuedAt: true,
  licenseExpiresAt: true,
  onboardingStatus: true,
  operationalStatus: true,
  complianceStatus: true,
  assignmentStatus: true,
  joinedAt: true,
  suspendedAt: true,
  deactivatedAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.DriverSelect;

export type DriverResponse = Pick<
  Driver,
  | 'id'
  | 'organizationId'
  | 'employeeId'
  | 'userId'
  | 'driverCode'
  | 'firstName'
  | 'lastName'
  | 'workEmail'
  | 'phoneNumber'
  | 'licenseNumber'
  | 'licenseIssuedAt'
  | 'licenseExpiresAt'
  | 'onboardingStatus'
  | 'operationalStatus'
  | 'complianceStatus'
  | 'assignmentStatus'
  | 'joinedAt'
  | 'suspendedAt'
  | 'deactivatedAt'
  | 'createdAt'
  | 'updatedAt'
> & {
  isEligibleForAssignment: boolean;
};

export const DRIVER_DOCUMENT_SELECT = {
  id: true,
  driverId: true,
  documentType: true,
  documentNumber: true,
  issuedAt: true,
  expiresAt: true,
  verificationStatus: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.DriverDocumentSelect;

export type DriverDocumentResponse = Pick<
  DriverDocument,
  | 'id'
  | 'driverId'
  | 'documentType'
  | 'documentNumber'
  | 'issuedAt'
  | 'expiresAt'
  | 'verificationStatus'
  | 'notes'
  | 'createdAt'
  | 'updatedAt'
>;

export const DRIVER_STATUS_HISTORY_SELECT = {
  id: true,
  driverId: true,
  statusCategory: true,
  previousValue: true,
  newValue: true,
  changedByUserId: true,
  reason: true,
  createdAt: true,
} as const satisfies Prisma.DriverStatusHistorySelect;

export type DriverStatusHistoryResponse = Pick<
  DriverStatusHistory,
  | 'id'
  | 'driverId'
  | 'statusCategory'
  | 'previousValue'
  | 'newValue'
  | 'changedByUserId'
  | 'reason'
  | 'createdAt'
>;

export const toDriverResponse = (
  driver: Omit<DriverResponse, 'isEligibleForAssignment'>,
  isEligibleForAssignment: boolean,
): DriverResponse => ({
  ...driver,
  isEligibleForAssignment,
});

export const toDriverDocumentResponse = (
  document: DriverDocumentResponse,
): DriverDocumentResponse => document;

export const toDriverStatusHistoryResponse = (
  history: DriverStatusHistoryResponse,
): DriverStatusHistoryResponse => history;
