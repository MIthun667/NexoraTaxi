import {
  CredentialDocumentType,
  CredentialVerificationStatus,
  WorkforceStatusCategory,
} from '@prisma/client';

import { DomainEventPayload } from '../../events/domain-events.types';

export const WorkforceEvents = {
  memberCreated: 'workforce_member.created',
  memberUpdated: 'workforce_member.updated',
  memberStatusChanged: 'workforce_member.status_changed',
  credentialCreated: 'credential_document.created',
  credentialVerified: 'credential_document.verified',
  credentialExpiringSoon: 'credential_document.expiring_soon',
} as const;

export interface WorkforceMemberCreatedEventPayload extends DomainEventPayload {
  workforceMemberId: string;
  organizationId: string;
  workerCode: string;
  workerType: string;
  employeeId?: string | null;
}

export interface WorkforceMemberUpdatedEventPayload extends DomainEventPayload {
  workforceMemberId: string;
  organizationId: string;
  changedFields: string[];
}

export interface WorkforceMemberStatusChangedEventPayload extends DomainEventPayload {
  workforceMemberId: string;
  organizationId: string;
  category: WorkforceStatusCategory;
  previousValue: string;
  nextValue: string;
  reason?: string | null;
  changedByUserId?: string | null;
}

export interface CredentialDocumentCreatedEventPayload extends DomainEventPayload {
  credentialId: string;
  workforceMemberId: string;
  organizationId: string;
  documentType: CredentialDocumentType;
  expiresAt?: string | null;
}

export interface CredentialDocumentVerifiedEventPayload extends DomainEventPayload {
  credentialId: string;
  workforceMemberId: string;
  organizationId: string;
  verificationStatus: CredentialVerificationStatus;
  verifiedByUserId?: string | null;
}

export interface CredentialDocumentExpiringSoonEventPayload extends DomainEventPayload {
  credentialId: string;
  workforceMemberId: string;
  organizationId: string;
  documentType: CredentialDocumentType;
  expiresAt: string;
  daysRemaining: number;
}
