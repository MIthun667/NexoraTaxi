import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  WorkforceAuthorizationStatus,
  WorkforceAuthorizationType,
} from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { CreateWorkforceMemberDto } from './dto/create-workforce-member.dto';
import { UpdateWorkforceMemberDto } from './dto/update-workforce-member.dto';
import {
  WorkforceEvents,
  WorkforceMemberCreatedEventPayload,
  WorkforceMemberUpdatedEventPayload,
} from './events/workforce.events';
import { CompatibilityIndexedWorkforceMemberInput } from './interfaces/compatibility-indexed-workforce-member.interface';
import {
  WORKFORCE_MEMBER_SELECT,
  toWorkforceMemberResponse,
  WorkforceMemberResponse,
} from './mappers/workforce.mapper';
import { WorkforcePolicyService } from './policies/workforce-policy.service';
import { WorkforceRepository } from './workforce.repository';

@Injectable()
export class WorkforceService {
  constructor(
    private readonly workforceRepository: WorkforceRepository,
    private readonly workforcePolicyService: WorkforcePolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async create(dto: CreateWorkforceMemberDto, principal?: CurrentPrincipal) {
    if (principal) {
      this.workforcePolicyService.assertCanCreate(principal, dto.organizationId);
    }

    const workforceMember = await this.workforceRepository.createMember({
      organization: { connect: { id: dto.organizationId } },
      ...(dto.employeeId ? { employee: { connect: { id: dto.employeeId } } } : {}),
      ...(dto.userId ? { user: { connect: { id: dto.userId } } } : {}),
      ...(dto.primaryDepartmentId
        ? { primaryDepartment: { connect: { id: dto.primaryDepartmentId } } }
        : {}),
      ...(dto.primaryPositionId
        ? { primaryPosition: { connect: { id: dto.primaryPositionId } } }
        : {}),
      ...(dto.homeZoneId ? { homeZone: { connect: { id: dto.homeZoneId } } } : {}),
      workerCode: dto.workerCode,
      workerType: dto.workerType,
      employmentModel: dto.employmentModel,
      firstName: dto.firstName,
      lastName: dto.lastName,
      displayName: dto.displayName ?? `${dto.firstName} ${dto.lastName}`,
      workEmail: dto.workEmail,
      phoneNumber: dto.phoneNumber,
      operationalStatus: dto.operationalStatus,
      complianceStatus: dto.complianceStatus,
      availabilityStatus: dto.availabilityStatus,
      skills: dto.skills as Prisma.InputJsonValue | undefined,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.recordCreationSideEffects(workforceMember, principal);

    return buildSuccessResponse(
      'Workforce member created successfully.',
      toWorkforceMemberResponse(workforceMember),
    );
  }

  async createCompatibilityIndexedMember(
    input: CompatibilityIndexedWorkforceMemberInput,
    principal: CurrentPrincipal | undefined,
    persistCompatibilityIndex: (
      tx: Prisma.TransactionClient,
      workforceMember: WorkforceMemberResponse,
    ) => Promise<void>,
  ) {
    this.workforcePolicyService.assertCanCreate(principal, input.organizationId);

    const workforceMember = await this.workforceRepository.runInTransaction(async (tx) => {
      const created = await tx.workforceMember.create({
        data: {
          id: input.id,
          organization: { connect: { id: input.organizationId } },
          ...(input.employeeId ? { employee: { connect: { id: input.employeeId } } } : {}),
          ...(input.userId ? { user: { connect: { id: input.userId } } } : {}),
          workerCode: input.workerCode,
          workerType: input.workerType,
          employmentModel: input.employmentModel,
          firstName: input.firstName,
          lastName: input.lastName,
          displayName: input.displayName,
          workEmail: input.workEmail,
          phoneNumber: input.phoneNumber,
          operationalStatus: input.operationalStatus,
          complianceStatus: input.complianceStatus,
          availabilityStatus: input.availabilityStatus,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
        select: WORKFORCE_MEMBER_SELECT,
      });

      await persistCompatibilityIndex(tx, created);
      return created;
    });

    const alignedWorkforceMember = await this.syncDriverCompatibilityExtensions(
      workforceMember.id,
      {
        joinedAt:
          this.readNullableString(this.readCompatibilityMetadata(workforceMember.metadata), 'joinedAt') ??
          null,
        licenseNumber:
          this.readNullableString(
            this.readCompatibilityMetadata(workforceMember.metadata),
            'licenseNumber',
          ) ?? null,
        licenseIssuedAt:
          this.readNullableString(
            this.readCompatibilityMetadata(workforceMember.metadata),
            'licenseIssuedAt',
          ) ?? null,
        licenseExpiresAt:
          this.readNullableString(
            this.readCompatibilityMetadata(workforceMember.metadata),
            'licenseExpiresAt',
          ) ?? null,
      },
      principal,
    );

    await this.recordCreationSideEffects(alignedWorkforceMember, principal);

    return buildSuccessResponse(
      'Workforce member created successfully.',
      toWorkforceMemberResponse(alignedWorkforceMember),
    );
  }

  async update(id: string, dto: UpdateWorkforceMemberDto, principal?: CurrentPrincipal) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one workforce field must be provided for update.');
    }

    const existing = await this.findActiveWorkforceMemberById(id);
    this.workforcePolicyService.assertCanUpdate(principal, existing.organizationId);

    const workforceMember = await this.workforceRepository.updateMember(id, {
      ...(dto.organizationId ? { organization: { connect: { id: dto.organizationId } } } : {}),
      ...(dto.employeeId !== undefined
        ? dto.employeeId
          ? { employee: { connect: { id: dto.employeeId } } }
          : { employee: { disconnect: true } }
        : {}),
      ...(dto.userId !== undefined
        ? dto.userId
          ? { user: { connect: { id: dto.userId } } }
          : { user: { disconnect: true } }
        : {}),
      ...(dto.primaryDepartmentId !== undefined
        ? dto.primaryDepartmentId
          ? { primaryDepartment: { connect: { id: dto.primaryDepartmentId } } }
          : { primaryDepartment: { disconnect: true } }
        : {}),
      ...(dto.primaryPositionId !== undefined
        ? dto.primaryPositionId
          ? { primaryPosition: { connect: { id: dto.primaryPositionId } } }
          : { primaryPosition: { disconnect: true } }
        : {}),
      ...(dto.homeZoneId !== undefined
        ? dto.homeZoneId
          ? { homeZone: { connect: { id: dto.homeZoneId } } }
          : { homeZone: { disconnect: true } }
        : {}),
      ...(dto.workerCode !== undefined ? { workerCode: dto.workerCode } : {}),
      ...(dto.workerType !== undefined ? { workerType: dto.workerType } : {}),
      ...(dto.employmentModel !== undefined ? { employmentModel: dto.employmentModel } : {}),
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
      ...(dto.workEmail !== undefined ? { workEmail: dto.workEmail } : {}),
      ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
      ...(dto.operationalStatus !== undefined
        ? { operationalStatus: dto.operationalStatus }
        : {}),
      ...(dto.complianceStatus !== undefined ? { complianceStatus: dto.complianceStatus } : {}),
      ...(dto.availabilityStatus !== undefined
        ? { availabilityStatus: dto.availabilityStatus }
        : {}),
      ...(dto.skills !== undefined
        ? {
            skills:
              dto.skills === null ? Prisma.JsonNull : (dto.skills as Prisma.InputJsonValue),
          }
        : {}),
      ...(dto.metadata !== undefined
        ? {
            metadata:
              dto.metadata === null
                ? Prisma.JsonNull
                : (dto.metadata as Prisma.InputJsonValue),
          }
        : {}),
    });

    await this.auditService.record({
      action: 'workforce.update',
      entityType: 'workforce-member',
      entityId: workforceMember.id,
      organizationId: workforceMember.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Updated workforce member ${workforceMember.workerCode}.`,
    });

    const changedFields = Object.keys(dto);
    const payload: WorkforceMemberUpdatedEventPayload = {
      workforceMemberId: workforceMember.id,
      organizationId: workforceMember.organizationId,
      changedFields,
    };
    await this.domainEventsService.publish({
      organizationId: workforceMember.organizationId,
      eventType: WorkforceEvents.memberUpdated,
      aggregateType: 'workforce-member',
      aggregateId: workforceMember.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Workforce member updated successfully.',
      toWorkforceMemberResponse(workforceMember),
    );
  }

  async archive(id: string, principal?: CurrentPrincipal) {
    const workforceMember = await this.findActiveWorkforceMemberById(id);
    this.workforcePolicyService.assertCanUpdate(principal, workforceMember.organizationId);
    const archivedAt = new Date();

    const archived = await this.workforceRepository.runInTransaction(async (tx) => {
      const archivedMember = await tx.workforceMember.update({
        where: { id },
        data: {
          deletedAt: archivedAt,
          operationalStatus: 'INACTIVE',
          availabilityStatus: 'RESTRICTED',
        },
        select: WORKFORCE_MEMBER_SELECT,
      });

      const compatibilityDriver = await tx.driver.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });

      if (compatibilityDriver) {
        await tx.driver.update({
          where: { id },
          data: {
            deletedAt: archivedAt,
            deactivatedAt: archivedAt,
            operationalStatus: 'INACTIVE',
            assignmentStatus: 'RESTRICTED',
          },
        });
      }

      return archivedMember;
    });

    await this.auditService.record({
      action: 'workforce.archive',
      entityType: 'workforce-member',
      entityId: archived.id,
      organizationId: archived.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Archived workforce member ${workforceMember.workerCode}.`,
      metadata: {
        compatibilityVisibilityArtifact: 'driver-row',
        compatibilityLifecycleMode: 'canonical-coupled-archive-when-linked',
      },
    });

    return buildSuccessResponse(
      'Workforce member archived successfully.',
      toWorkforceMemberResponse(archived),
    );
  }

  async findOne(id: string) {
    const workforceMember = await this.findActiveWorkforceMemberById(id);
    return buildSuccessResponse(
      'Workforce member retrieved successfully.',
      toWorkforceMemberResponse(workforceMember),
    );
  }

  async findAll() {
    throw new BadRequestException(
      'WorkforceService.findAll is no longer the primary read path. Use WorkforceQueryService instead.',
    );
  }

  async addCredential() {
    throw new BadRequestException(
      'Use WorkforceCredentialService for credential operations.',
    );
  }

  async listCredentials() {
    throw new BadRequestException(
      'Use WorkforceCredentialService for credential operations.',
    );
  }

  async updateStatus() {
    throw new BadRequestException(
      'Use WorkforceStatusService for status transitions.',
    );
  }

  async getStatusHistory() {
    throw new BadRequestException(
      'Use WorkforceQueryService for history queries.',
    );
  }

  async syncDriverCompatibilityExtensions(
    id: string,
    fields: {
      joinedAt?: string | null;
      licenseNumber?: string | null;
      licenseIssuedAt?: string | null;
      licenseExpiresAt?: string | null;
    },
    principal?: CurrentPrincipal,
  ) {
    const workforceMember = await this.findActiveWorkforceMemberById(id);
    this.workforcePolicyService.assertCanUpdate(principal, workforceMember.organizationId);

    const hasJoinedAtField = fields.joinedAt !== undefined;
    const hasLicenseField =
      fields.licenseNumber !== undefined ||
      fields.licenseIssuedAt !== undefined ||
      fields.licenseExpiresAt !== undefined;

    if (!hasJoinedAtField && !hasLicenseField) {
      return workforceMember;
    }

    return this.workforceRepository.runInTransaction(async (tx) => {
      if (hasJoinedAtField) {
        const engagementStartDate = fields.joinedAt ? new Date(fields.joinedAt) : null;
        const existingProfile = await tx.workforceProfileExtension.findUnique({
          where: { workforceMemberId: id },
          select: { id: true, metadata: true },
        });

        if (engagementStartDate) {
          const profileMetadata = this.mergeMetadata(existingProfile?.metadata ?? null, {
            extensionAlignment: {
              source: 'drivers-compatibility-write',
              field: 'joinedAt',
              ownership: 'extension-first',
            },
          });

          if (existingProfile) {
            await tx.workforceProfileExtension.update({
              where: { workforceMemberId: id },
              data: {
                engagementStartDate,
                metadata: profileMetadata,
              },
            });
          } else {
            await tx.workforceProfileExtension.create({
              data: {
                organizationId: workforceMember.organizationId,
                workforceMemberId: id,
                engagementStartDate,
                metadata: profileMetadata,
              },
            });
          }
        }
      }

      if (hasLicenseField) {
        const existingAuthorizations = await tx.workforceAuthorization.findMany({
          where: {
            workforceMemberId: id,
            authorizationType: WorkforceAuthorizationType.LICENSE,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            identifierValue: true,
            issuedAt: true,
            expiresAt: true,
            status: true,
            metadata: true,
          },
        });

        if (existingAuthorizations.length > 1) {
          throw new ConflictException(
            'Cannot align driver license compatibility fields because multiple LICENSE authorizations exist for the linked workforce member.',
          );
        }

        const existingAuthorization = existingAuthorizations[0] ?? null;
        const metadata = this.readCompatibilityMetadata(workforceMember.metadata);
        const currentIdentifierValue =
          existingAuthorization?.identifierValue ??
          this.readNullableString(metadata, 'licenseNumber');
        const currentIssuedAt =
          existingAuthorization?.issuedAt ?? this.readDate(metadata, 'licenseIssuedAt');
        const currentExpiresAt =
          existingAuthorization?.expiresAt ?? this.readDate(metadata, 'licenseExpiresAt');

        const identifierValue =
          fields.licenseNumber !== undefined
            ? fields.licenseNumber ?? currentIdentifierValue
            : currentIdentifierValue;
        const issuedAt =
          fields.licenseIssuedAt !== undefined
            ? fields.licenseIssuedAt
              ? new Date(fields.licenseIssuedAt)
              : currentIssuedAt
            : currentIssuedAt;
        const expiresAt =
          fields.licenseExpiresAt !== undefined
            ? fields.licenseExpiresAt
              ? new Date(fields.licenseExpiresAt)
              : currentExpiresAt
            : currentExpiresAt;

        if (existingAuthorization) {
          await tx.workforceAuthorization.update({
            where: { id: existingAuthorization.id },
            data: {
              identifierValue,
              issuedAt,
              expiresAt,
              status: this.deriveAuthorizationStatus(expiresAt),
              metadata: this.mergeMetadata(existingAuthorization.metadata, {
                extensionAlignment: {
                  source: 'drivers-compatibility-write',
                  fields: ['licenseNumber', 'licenseIssuedAt', 'licenseExpiresAt'],
                  ownership: 'extension-first',
                },
              }),
            },
          });
        } else if (identifierValue) {
          await tx.workforceAuthorization.create({
            data: {
              organizationId: workforceMember.organizationId,
              workforceMemberId: id,
              authorizationType: WorkforceAuthorizationType.LICENSE,
              identifierValue,
              issuedAt,
              expiresAt,
              status: this.deriveAuthorizationStatus(expiresAt),
              metadata: {
                extensionAlignment: {
                  source: 'drivers-compatibility-write',
                  fields: ['licenseNumber', 'licenseIssuedAt', 'licenseExpiresAt'],
                  ownership: 'extension-first',
                },
              },
            },
          });
        }
      }

      const refreshedProfile = await tx.workforceProfileExtension.findUnique({
        where: { workforceMemberId: id },
        select: { engagementStartDate: true },
      });
      const refreshedAuthorizations = await tx.workforceAuthorization.findMany({
        where: {
          workforceMemberId: id,
          authorizationType: WorkforceAuthorizationType.LICENSE,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          identifierValue: true,
          issuedAt: true,
          expiresAt: true,
        },
      });
      const selectedAuthorization =
        refreshedAuthorizations.length === 1 ? refreshedAuthorizations[0] : null;
      const updatedMetadata = this.mergeMetadata(workforceMember.metadata, {
        ...(refreshedProfile?.engagementStartDate
          ? { joinedAt: refreshedProfile.engagementStartDate.toISOString() }
          : {}),
        ...(selectedAuthorization?.identifierValue
          ? { licenseNumber: selectedAuthorization.identifierValue }
          : {}),
        ...(selectedAuthorization?.issuedAt
          ? { licenseIssuedAt: selectedAuthorization.issuedAt.toISOString() }
          : {}),
        ...(selectedAuthorization?.expiresAt
          ? { licenseExpiresAt: selectedAuthorization.expiresAt.toISOString() }
          : {}),
        writeOwner: 'workforce',
        compatibilitySource: 'drivers',
        extensionOwnership: {
          joinedAt: 'workforce-profile-extension',
          license: 'workforce-authorization',
          metadataRole: 'fallback-sync',
        },
      });

      await tx.workforceMember.update({
        where: { id },
        data: {
          metadata: updatedMetadata,
        },
      });

      const refreshed = await tx.workforceMember.findFirst({
        where: { id, deletedAt: null },
        select: WORKFORCE_MEMBER_SELECT,
      });

      if (!refreshed) {
        throw new NotFoundException('Workforce member not found after extension alignment.');
      }

      return refreshed;
    });
  }

  private async findActiveWorkforceMemberById(id: string) {
    const workforceMember = await this.workforceRepository.findMemberById(id);

    if (!workforceMember) {
      throw new NotFoundException('Workforce member not found.');
    }

    return workforceMember;
  }

  private async ensureOrganizationExists(id: string) {
    const organization = await this.workforceRepository.runInTransaction((tx) =>
      tx.organization.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      }),
    );

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }
  }

  private async recordCreationSideEffects(
    workforceMember: WorkforceMemberResponse,
    principal?: CurrentPrincipal,
  ) {
    await this.auditService.record({
      action: 'workforce.create',
      entityType: 'workforce-member',
      entityId: workforceMember.id,
      organizationId: workforceMember.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Created workforce member ${workforceMember.workerCode}.`,
    });

    const payload: WorkforceMemberCreatedEventPayload = {
      workforceMemberId: workforceMember.id,
      organizationId: workforceMember.organizationId,
      workerCode: workforceMember.workerCode,
      workerType: workforceMember.workerType,
      employeeId: workforceMember.employeeId,
    };

    await this.domainEventsService.publish({
      organizationId: workforceMember.organizationId,
      eventType: WorkforceEvents.memberCreated,
      aggregateType: 'workforce-member',
      aggregateId: workforceMember.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });
  }

  private readCompatibilityMetadata(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private readNullableString(metadata: Record<string, unknown> | null, key: string) {
    const value = metadata?.[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private readDate(metadata: Record<string, unknown> | null, key: string) {
    const value = metadata?.[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private mergeMetadata(
    existing: Prisma.JsonValue | null,
    extra: Prisma.InputJsonObject,
  ): Prisma.InputJsonObject {
    return {
      ...((this.readCompatibilityMetadata(existing) ?? {}) as Prisma.InputJsonObject),
      ...extra,
    };
  }

  private deriveAuthorizationStatus(expiresAt: Date | null): WorkforceAuthorizationStatus {
    return expiresAt && expiresAt.getTime() < Date.now()
      ? WorkforceAuthorizationStatus.EXPIRED
      : WorkforceAuthorizationStatus.PENDING;
  }
}
