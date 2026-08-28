import { CredentialDocumentType, CredentialVerificationStatus } from '@prisma/client';

export interface CredentialSummaryItemPresenter {
  id: string;
  workforceMemberId: string;
  documentType: CredentialDocumentType;
  title: string;
  documentNumber: string | null;
  issuingAuthority: string | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  verificationStatus: CredentialVerificationStatus;
  verifiedByUserId: string | null;
  verifiedAt: Date | null;
  storageUrl: string | null;
}
