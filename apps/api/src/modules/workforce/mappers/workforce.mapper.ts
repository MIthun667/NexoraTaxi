import {
  CredentialDocument,
  WorkforceAuthorization,
  WorkforceAuthorizationType,
  WorkforceMember,
  WorkforceProfileExtension,
  WorkforceStatusHistory,
} from '@prisma/client';

export const WORKFORCE_MEMBER_SELECT = {
  id: true,
  organizationId: true,
  employeeId: true,
  userId: true,
  workerCode: true,
  workerType: true,
  employmentModel: true,
  firstName: true,
  lastName: true,
  displayName: true,
  workEmail: true,
  phoneNumber: true,
  operationalStatus: true,
  complianceStatus: true,
  availabilityStatus: true,
  primaryDepartmentId: true,
  primaryPositionId: true,
  homeZoneId: true,
  skills: true,
  metadata: true,
  profileExtension: {
    select: {
      id: true,
      engagementStartDate: true,
      metadata: true,
    },
  },
  authorizations: {
    where: { authorizationType: WorkforceAuthorizationType.LICENSE },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      authorizationType: true,
      identifierValue: true,
      issuingAuthority: true,
      issuedAt: true,
      expiresAt: true,
      status: true,
      evidenceDocumentId: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

export const WORKFORCE_MEMBER_WITH_LIFECYCLE_SELECT = {
  ...WORKFORCE_MEMBER_SELECT,
  deletedAt: true,
} as const;

export const CREDENTIAL_DOCUMENT_SELECT = {
  id: true,
  organizationId: true,
  workforceMemberId: true,
  documentType: true,
  title: true,
  documentNumber: true,
  issuingAuthority: true,
  issuedAt: true,
  expiresAt: true,
  verificationStatus: true,
  verifiedByUserId: true,
  verifiedAt: true,
  storageUrl: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const WORKFORCE_STATUS_HISTORY_SELECT = {
  id: true,
  organizationId: true,
  workforceMemberId: true,
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

export type WorkforceMemberResponse = Pick<
  WorkforceMember,
  | 'id'
  | 'organizationId'
  | 'employeeId'
  | 'userId'
  | 'workerCode'
  | 'workerType'
  | 'employmentModel'
  | 'firstName'
  | 'lastName'
  | 'displayName'
  | 'workEmail'
  | 'phoneNumber'
  | 'operationalStatus'
  | 'complianceStatus'
  | 'availabilityStatus'
  | 'primaryDepartmentId'
  | 'primaryPositionId'
  | 'homeZoneId'
  | 'skills'
  | 'metadata'
  | 'createdAt'
  | 'updatedAt'
> & {
  profileExtension: Pick<
    WorkforceProfileExtension,
    'id' | 'engagementStartDate' | 'metadata'
  > | null;
  authorizations: Array<
    Pick<
      WorkforceAuthorization,
      | 'id'
      | 'authorizationType'
      | 'identifierValue'
      | 'issuingAuthority'
      | 'issuedAt'
      | 'expiresAt'
      | 'status'
      | 'evidenceDocumentId'
      | 'metadata'
      | 'createdAt'
      | 'updatedAt'
    >
  >;
};

export type WorkforceMemberLifecycleResponse = WorkforceMemberResponse & Pick<
  WorkforceMember,
  'deletedAt'
>;

export type CredentialDocumentResponse = Pick<
  CredentialDocument,
  | 'id'
  | 'organizationId'
  | 'workforceMemberId'
  | 'documentType'
  | 'title'
  | 'documentNumber'
  | 'issuingAuthority'
  | 'issuedAt'
  | 'expiresAt'
  | 'verificationStatus'
  | 'verifiedByUserId'
  | 'verifiedAt'
  | 'storageUrl'
  | 'metadata'
  | 'createdAt'
  | 'updatedAt'
>;

export type WorkforceStatusHistoryResponse = Pick<
  WorkforceStatusHistory,
  | 'id'
  | 'organizationId'
  | 'workforceMemberId'
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

export const toWorkforceMemberResponse = (
  workforceMember: WorkforceMemberResponse,
): WorkforceMemberResponse => workforceMember;

export const toCredentialDocumentResponse = (
  document: CredentialDocumentResponse,
): CredentialDocumentResponse => document;

export const toWorkforceStatusHistoryResponse = (
  entry: WorkforceStatusHistoryResponse,
): WorkforceStatusHistoryResponse => entry;
