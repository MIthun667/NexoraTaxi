import { Injectable, NotFoundException } from '@nestjs/common';
import { CredentialVerificationStatus, Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import {
  CredentialDocumentCreatedEventPayload,
  CredentialDocumentVerifiedEventPayload,
  WorkforceEvents,
} from './events/workforce.events';
import { toCredentialDocumentResponse } from './mappers/workforce.mapper';
import { WorkforcePolicyService } from './policies/workforce-policy.service';
import { CreateCredentialDocumentDto } from './dto/create-credential-document.dto';
import { UpdateCredentialDocumentDto } from './dto/update-credential-document.dto';
import { VerifyCredentialDocumentDto } from './dto/verify-credential-document.dto';
import { WorkforceRepository } from './workforce.repository';

@Injectable()
export class WorkforceCredentialService {
  constructor(
    private readonly workforceRepository: WorkforceRepository,
    private readonly workforcePolicyService: WorkforcePolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async createCredential(
    workforceMemberId: string,
    dto: CreateCredentialDocumentDto,
    principal?: CurrentPrincipal,
  ) {
    const workforceMember = await this.workforceRepository.findMemberById(workforceMemberId);
    if (!workforceMember) {
      throw new NotFoundException('Workforce member not found.');
    }

    this.workforcePolicyService.assertCanUpdate(principal, workforceMember.organizationId);

    const document = await this.workforceRepository.createCredential({
      organization: { connect: { id: dto.organizationId ?? workforceMember.organizationId } },
      workforceMember: { connect: { id: workforceMemberId } },
      documentType: dto.documentType,
      title: dto.title,
      documentNumber: dto.documentNumber,
      issuingAuthority: dto.issuingAuthority,
      issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      verificationStatus: dto.verificationStatus,
      verifiedByUser: dto.verifiedByUserId
        ? { connect: { id: dto.verifiedByUserId } }
        : undefined,
      verifiedAt: dto.verifiedAt ? new Date(dto.verifiedAt) : undefined,
      storageUrl: dto.storageUrl,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.record({
      action: 'workforce.credential.create',
      entityType: 'credential-document',
      entityId: document.id,
      organizationId: document.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Created credential ${document.documentType} for workforce member ${workforceMember.workerCode}.`,
    });

    const payload: CredentialDocumentCreatedEventPayload = {
      credentialId: document.id,
      workforceMemberId,
      organizationId: document.organizationId,
      documentType: document.documentType,
      expiresAt: document.expiresAt?.toISOString() ?? null,
    };

    await this.domainEventsService.publish({
      organizationId: document.organizationId,
      eventType: WorkforceEvents.credentialCreated,
      aggregateType: 'credential-document',
      aggregateId: document.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Credential document recorded successfully.',
      toCredentialDocumentResponse(document),
    );
  }

  async listCredentials(workforceMemberId: string, principal?: CurrentPrincipal) {
    const workforceMember = await this.workforceRepository.findMemberById(workforceMemberId);
    if (!workforceMember) {
      throw new NotFoundException('Workforce member not found.');
    }

    this.workforcePolicyService.assertCanView(principal, workforceMember.organizationId);
    const documents = await this.workforceRepository.listCredentials(workforceMemberId);

    return buildSuccessResponse(
      'Credential documents retrieved successfully.',
      documents.map((item) => toCredentialDocumentResponse(item)),
    );
  }

  async verifyCredential(
    credentialId: string,
    dto: VerifyCredentialDocumentDto,
    principal?: CurrentPrincipal,
  ) {
    const credential = await this.workforceRepository.findCredentialById(credentialId);
    if (!credential) {
      throw new NotFoundException('Credential document not found.');
    }

    this.workforcePolicyService.assertCanVerifyCredential(principal, credential.organizationId);

    const metadataPayload = {
      ...(dto.metadata ?? {}),
      ...(dto.notes ? { notes: dto.notes } : {}),
    };

    const updatedCredential = await this.workforceRepository.updateCredential(credentialId, {
      verificationStatus: dto.verificationStatus,
      verifiedByUser: principal?.userId ? { connect: { id: principal.userId } } : undefined,
      verifiedAt: dto.verifiedAt ? new Date(dto.verifiedAt) : new Date(),
      metadata:
        Object.keys(metadataPayload).length > 0
          ? (metadataPayload as Prisma.InputJsonValue)
          : undefined,
    });

    await this.auditService.record({
      action: 'workforce.credential.verify',
      entityType: 'credential-document',
      entityId: updatedCredential.id,
      organizationId: updatedCredential.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Updated credential ${updatedCredential.id} verification status to ${updatedCredential.verificationStatus.toLowerCase()}.`,
    });

    const payload: CredentialDocumentVerifiedEventPayload = {
      credentialId: updatedCredential.id,
      workforceMemberId: updatedCredential.workforceMemberId,
      organizationId: updatedCredential.organizationId,
      verificationStatus: updatedCredential.verificationStatus,
      verifiedByUserId: principal?.userId ?? null,
    };

    await this.domainEventsService.publish({
      organizationId: updatedCredential.organizationId,
      eventType: WorkforceEvents.credentialVerified,
      aggregateType: 'credential-document',
      aggregateId: updatedCredential.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Credential verification updated successfully.',
      toCredentialDocumentResponse(updatedCredential),
    );
  }

  async updateCredential(
    credentialId: string,
    dto: UpdateCredentialDocumentDto,
    principal?: CurrentPrincipal,
  ) {
    const credential = await this.workforceRepository.findCredentialById(credentialId);
    if (!credential) {
      throw new NotFoundException('Credential document not found.');
    }

    this.workforcePolicyService.assertCanUpdate(principal, credential.organizationId);

    const existingMetadata =
      credential.metadata &&
      typeof credential.metadata === 'object' &&
      !Array.isArray(credential.metadata)
        ? (credential.metadata as Record<string, unknown>)
        : {};
    const metadataPayload = {
      ...existingMetadata,
      ...(dto.metadata ?? {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    };

    const nextVerificationStatus = dto.verificationStatus ?? credential.verificationStatus;
    const updatedCredential = await this.workforceRepository.updateCredential(credentialId, {
      ...(dto.documentType !== undefined ? { documentType: dto.documentType } : {}),
      ...(dto.title !== undefined && dto.title !== null ? { title: dto.title } : {}),
      ...(dto.documentNumber !== undefined ? { documentNumber: dto.documentNumber } : {}),
      ...(dto.issuingAuthority !== undefined ? { issuingAuthority: dto.issuingAuthority } : {}),
      ...(dto.issuedAt !== undefined
        ? { issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null }
        : {}),
      ...(dto.expiresAt !== undefined
        ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
        : {}),
      ...(dto.storageUrl !== undefined ? { storageUrl: dto.storageUrl } : {}),
      ...(dto.verificationStatus !== undefined
        ? {
            verificationStatus: dto.verificationStatus,
            verifiedByUser: principal?.userId ? { connect: { id: principal.userId } } : undefined,
            verifiedAt:
              dto.verifiedAt !== undefined
                ? dto.verifiedAt
                  ? new Date(dto.verifiedAt)
                  : null
                : nextVerificationStatus === CredentialVerificationStatus.PENDING
                  ? null
                  : new Date(),
          }
        : {}),
      metadata:
        Object.keys(metadataPayload).length > 0
          ? (metadataPayload as Prisma.InputJsonValue)
          : undefined,
    });

    await this.auditService.record({
      action: 'workforce.credential.update',
      entityType: 'credential-document',
      entityId: updatedCredential.id,
      organizationId: updatedCredential.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Updated credential ${updatedCredential.id}.`,
      metadata: {
        changedFields: Object.keys(dto),
      },
    });

    if (
      dto.verificationStatus !== undefined &&
      dto.verificationStatus !== credential.verificationStatus
    ) {
      const payload: CredentialDocumentVerifiedEventPayload = {
        credentialId: updatedCredential.id,
        workforceMemberId: updatedCredential.workforceMemberId,
        organizationId: updatedCredential.organizationId,
        verificationStatus: updatedCredential.verificationStatus,
        verifiedByUserId: principal?.userId ?? null,
      };

      await this.domainEventsService.publish({
        organizationId: updatedCredential.organizationId,
        eventType: WorkforceEvents.credentialVerified,
        aggregateType: 'credential-document',
        aggregateId: updatedCredential.id,
        triggeredByUserId: principal?.userId ?? null,
        payload,
      });
    }

    return buildSuccessResponse(
      'Credential document updated successfully.',
      toCredentialDocumentResponse(updatedCredential),
    );
  }
}
