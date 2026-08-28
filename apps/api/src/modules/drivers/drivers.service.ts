import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CredentialDocumentType,
  CredentialVerificationStatus,
  DocumentVerificationStatus,
  DriverAssignmentStatus,
  DriverComplianceStatus,
  DriverDocumentType,
  NotificationCategory,
  NotificationSeverity,
  DriverOnboardingStatus,
  DriverOperationalStatus,
  DriverStatusCategory,
  Prisma,
  UserStatus,
  WorkforceAvailabilityStatus,
  WorkforceComplianceStatus,
  WorkforceEmploymentModel,
  WorkforceMemberType,
  WorkforceOperationalStatus,
} from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { CreateCredentialDocumentDto } from '../workforce/dto/create-credential-document.dto';
import { UpdateWorkforceMemberDto } from '../workforce/dto/update-workforce-member.dto';
import { UpdateWorkforceStatusDto } from '../workforce/dto/update-workforce-status.dto';
import { CreateDriverDocumentDto } from './dto/create-driver-document.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { QueryDriversDto } from './dto/query-drivers.dto';
import { UpdateDriverDocumentDto } from './dto/update-driver-document.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { WorkforceCredentialService } from '../workforce/workforce-credential.service';
import { WorkforceService } from '../workforce/workforce.service';
import { WorkforceStatusService } from '../workforce/workforce-status.service';
import { CompatibilityIndexedWorkforceMemberInput } from '../workforce/interfaces/compatibility-indexed-workforce-member.interface';
import {
  DRIVER_DOCUMENT_SELECT,
  DRIVER_SELECT,
  DRIVER_STATUS_HISTORY_SELECT,
  DriverDocumentResponse,
  DriverResponse,
  DriverStatusHistoryResponse,
  toDriverDocumentResponse,
  toDriverResponse,
  toDriverStatusHistoryResponse,
} from './mappers/driver.mapper';
import {
  CREDENTIAL_DOCUMENT_SELECT,
  CredentialDocumentResponse,
  WORKFORCE_MEMBER_SELECT,
  WorkforceMemberResponse,
  WORKFORCE_MEMBER_WITH_LIFECYCLE_SELECT,
  WorkforceMemberLifecycleResponse,
  WORKFORCE_STATUS_HISTORY_SELECT,
  WorkforceStatusHistoryResponse,
} from '../workforce/mappers/workforce.mapper';

@Injectable()
export class DriversService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
    private readonly workforceService: WorkforceService,
    private readonly workforceStatusService: WorkforceStatusService,
    private readonly workforceCredentialService: WorkforceCredentialService,
  ) {}

  async create(dto: CreateDriverDto, principal?: CurrentPrincipal) {
    await this.ensureOrganizationExists(dto.organizationId);
    await this.validateDriverLinks(dto.organizationId, dto.employeeId, dto.userId);
    await this.ensureDriverCodeIsAvailable(dto.organizationId, dto.driverCode);
    await this.ensureLicenseNumberIsAvailable(dto.organizationId, dto.licenseNumber);
    await this.ensureWorkforceCompatibilityIndexIsAvailable(dto);

    const driverId = randomUUID();
    let compatibilityDriver: Omit<DriverResponse, 'isEligibleForAssignment'> | null = null;

    const workforceResponse = await this.workforceService.createCompatibilityIndexedMember(
      this.buildCompatibilityIndexedWorkforceInput(driverId, dto),
      principal,
      async (transaction, workforceMember) => {
        compatibilityDriver = await transaction.driver.create({
          data: this.buildCompatibilityDriverCreateData(workforceMember.id, dto),
          select: DRIVER_SELECT,
        });
      },
    );

    const driver =
      compatibilityDriver ??
      (await this.findActiveDriverById(workforceResponse.data.id));

    return buildSuccessResponse(
      'Operator profile created successfully.',
      this.toCompatibilityDriverResponse(driver, workforceResponse.data),
    );
  }

  async findAll(query: QueryDriversDto) {
    const { page, limit, skip } = resolvePagination(query);
    const where: Prisma.DriverWhereInput = {
      deletedAt: null,
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    };

    const drivers = await this.prismaService.driver.findMany({
      where,
      select: DRIVER_SELECT,
      orderBy: [{ createdAt: 'desc' }],
    });

    const canonicalLifecycleStates = await this.listCanonicalDriverLifecycleStatesByIds(
      drivers.map((driver) => driver.id),
    );
    const canonicalById = new Map(
      canonicalLifecycleStates
        .filter((driver) => driver.deletedAt === null)
        .map((driver) => [driver.id, driver]),
    );
    const archivedCanonicalIdSet = new Set(
      canonicalLifecycleStates
        .filter((driver) => driver.deletedAt !== null)
        .map((driver) => driver.id),
    );
    const compatibilityDrivers = drivers
      .filter((driver) => !archivedCanonicalIdSet.has(driver.id))
      .filter((driver) => {
        const canonicalDriver = canonicalById.get(driver.id);
        return canonicalDriver
          ? this.getLinkedReadMismatchReasons(driver, canonicalDriver).length === 0
          : true;
      })
      .map((driver) =>
        this.toCompatibilityDriverResponse(driver, canonicalById.get(driver.id) ?? null),
      );
    const filteredDrivers = compatibilityDrivers
      .filter((driver) => this.matchesDriverFilters(driver, query))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return buildPaginatedResponse(
      'Operators retrieved successfully.',
      filteredDrivers.slice(skip, skip + limit),
      buildPaginationMeta({ page, limit, total: filteredDrivers.length }),
    );
  }

  async findOne(id: string) {
    const driver = await this.findActiveDriverById(id);
    const canonicalLifecycleState = await this.findCanonicalDriverLifecycleStateById(id);

    if (canonicalLifecycleState?.deletedAt) {
      throw new ConflictException(
        'Operator visibility drift detected: the canonical workforce record is archived while the legacy compatibility row remains active.',
      );
    }

    const canonicalDriver = canonicalLifecycleState && canonicalLifecycleState.deletedAt === null
      ? canonicalLifecycleState
      : null;

    if (canonicalDriver) {
      const mismatchReasons = this.getLinkedReadMismatchReasons(driver, canonicalDriver);
      if (mismatchReasons.length > 0) {
        throw new ConflictException(
          `Operator compatibility drift detected: ${mismatchReasons.join(', ')}.`,
        );
      }
    }

    return buildSuccessResponse(
      'Operator profile retrieved successfully.',
      this.toCompatibilityDriverResponse(driver, canonicalDriver),
    );
  }

  async update(id: string, dto: UpdateDriverDto, principal?: CurrentPrincipal) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one operator field must be provided for update.');
    }

    const existingDriver = await this.findActiveDriverById(id);
    const canonicalDriver = await this.findCanonicalDriverById(id);

    if (canonicalDriver && this.canRouteProfileUpdateToCanonical(dto)) {
      this.assertDriverCompatibilityExtensionAlignmentIsSafe(canonicalDriver, dto);

      const updatedMember = (
        await this.workforceService.update(
          id,
          this.buildWorkforceUpdateDto(existingDriver, canonicalDriver, dto),
          principal,
        )
      ).data;

      const alignedMember = await this.workforceService.syncDriverCompatibilityExtensions(
        id,
        {
          ...(dto.joinedAt !== undefined ? { joinedAt: dto.joinedAt } : {}),
          ...(dto.licenseNumber !== undefined ? { licenseNumber: dto.licenseNumber } : {}),
          ...(dto.licenseIssuedAt !== undefined ? { licenseIssuedAt: dto.licenseIssuedAt } : {}),
          ...(dto.licenseExpiresAt !== undefined
            ? { licenseExpiresAt: dto.licenseExpiresAt }
            : {}),
        },
        principal,
      );

      return buildSuccessResponse(
        'Operator profile updated successfully.',
        this.toCompatibilityDriverResponse(existingDriver, alignedMember ?? updatedMember),
      );
    }

    const organizationId = dto.organizationId ?? existingDriver.organizationId;
    const employeeId = dto.employeeId !== undefined ? dto.employeeId : existingDriver.employeeId;
    const userId = dto.userId !== undefined ? dto.userId : existingDriver.userId;
    const driverCode = dto.driverCode ?? existingDriver.driverCode;
    const licenseNumber = dto.licenseNumber ?? existingDriver.licenseNumber;

    if (dto.organizationId) {
      await this.ensureOrganizationExists(dto.organizationId);
    }

    await this.validateDriverLinks(organizationId, employeeId ?? undefined, userId ?? undefined);

    if (
      organizationId !== existingDriver.organizationId ||
      driverCode !== existingDriver.driverCode
    ) {
      await this.ensureDriverCodeIsAvailable(organizationId, driverCode, id);
    }

    if (
      organizationId !== existingDriver.organizationId ||
      licenseNumber !== existingDriver.licenseNumber
    ) {
      await this.ensureLicenseNumberIsAvailable(organizationId, licenseNumber, id);
    }

    const driver = await this.prismaService.driver.update({
      where: { id },
      data: {
        ...(dto.organizationId !== undefined ? { organizationId: dto.organizationId } : {}),
        ...(dto.employeeId !== undefined ? { employeeId: dto.employeeId } : {}),
        ...(dto.userId !== undefined ? { userId: dto.userId } : {}),
        ...(dto.driverCode !== undefined ? { driverCode: dto.driverCode } : {}),
        ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
        ...(dto.workEmail !== undefined ? { workEmail: dto.workEmail } : {}),
        ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
        ...(dto.licenseNumber !== undefined ? { licenseNumber: dto.licenseNumber } : {}),
        ...(dto.licenseIssuedAt !== undefined
          ? { licenseIssuedAt: dto.licenseIssuedAt ? new Date(dto.licenseIssuedAt) : null }
          : {}),
        ...(dto.licenseExpiresAt !== undefined
          ? { licenseExpiresAt: dto.licenseExpiresAt ? new Date(dto.licenseExpiresAt) : null }
          : {}),
        ...(dto.onboardingStatus !== undefined
          ? { onboardingStatus: dto.onboardingStatus }
          : {}),
        ...(dto.operationalStatus !== undefined
          ? {
              operationalStatus: dto.operationalStatus,
              ...(dto.operationalStatus === DriverOperationalStatus.SUSPENDED
                ? { suspendedAt: new Date() }
                : {}),
              ...(dto.operationalStatus === DriverOperationalStatus.INACTIVE ||
              dto.operationalStatus === DriverOperationalStatus.BLOCKED
                ? { deactivatedAt: new Date() }
                : {}),
            }
          : {}),
        ...(dto.complianceStatus !== undefined ? { complianceStatus: dto.complianceStatus } : {}),
        ...(dto.assignmentStatus !== undefined ? { assignmentStatus: dto.assignmentStatus } : {}),
        ...(dto.joinedAt !== undefined ? { joinedAt: new Date(dto.joinedAt) } : {}),
      },
      select: DRIVER_SELECT,
    });

    return buildSuccessResponse(
      'Operator profile updated successfully.',
      this.toDriverResponseWithEligibility(driver),
    );
  }

  async archive(id: string, principal?: CurrentPrincipal) {
    await this.findActiveDriverById(id);
    const canonicalLifecycleState = await this.findCanonicalDriverLifecycleStateById(id);

    if (canonicalLifecycleState?.deletedAt) {
      throw new ConflictException(
        'Operator lifecycle drift detected: canonical workforce record is already archived while the legacy compatibility row remains visible.',
      );
    }

    let driver: Omit<DriverResponse, 'isEligibleForAssignment'>;

    if (canonicalLifecycleState) {
      await this.workforceService.archive(id, principal);
      driver = await this.findDriverByIdIncludingArchived(id);
    } else {
      driver = await this.prismaService.driver.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deactivatedAt: new Date(),
          operationalStatus: DriverOperationalStatus.INACTIVE,
          assignmentStatus: DriverAssignmentStatus.RESTRICTED,
        },
        select: DRIVER_SELECT,
      });
    }

    return buildSuccessResponse(
      'Operator profile archived successfully.',
      this.toDriverResponseWithEligibility(driver),
    );
  }

  async addDocument(
    driverId: string,
    dto: CreateDriverDocumentDto,
    principal?: CurrentPrincipal,
  ) {
    const driver = await this.findActiveDriverById(driverId);
    const canonicalDriver = await this.findCanonicalDriverById(driverId);

    if (canonicalDriver) {
      const response = await this.workforceCredentialService.createCredential(
        driverId,
        this.buildCreateCredentialDto(dto, driver.organizationId),
        principal,
      );

      return buildSuccessResponse(
        'Operator document recorded successfully.',
        this.mapCanonicalDocumentToDriverDocument(response.data),
      );
    }

    const document = await this.prismaService.$transaction(async (transaction) => {
      const created = await transaction.driverDocument.create({
        data: {
          driverId: driver.id,
          documentType: dto.documentType,
          documentNumber: dto.documentNumber,
          issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          verificationStatus:
            dto.verificationStatus ?? DocumentVerificationStatus.PENDING,
          notes: dto.notes,
        },
        select: DRIVER_DOCUMENT_SELECT,
      });

      await this.recalculateComplianceStatus(transaction, driver.id);

      return created;
    });

    return buildSuccessResponse(
      'Operator document recorded successfully.',
      toDriverDocumentResponse(document),
    );
  }

  async listDocuments(driverId: string) {
    await this.findActiveDriverById(driverId);

    const [legacyDocuments, canonicalDocuments] = await Promise.all([
      this.prismaService.driverDocument.findMany({
        where: { driverId },
        select: DRIVER_DOCUMENT_SELECT,
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prismaService.credentialDocument.findMany({
        where: { workforceMemberId: driverId },
        select: CREDENTIAL_DOCUMENT_SELECT,
        orderBy: [{ createdAt: 'desc' }],
      }),
    ]);

    const documents = this.hasCanonicalParity(
      legacyDocuments.map((document) => document.id),
      canonicalDocuments.map((document) => document.id),
    )
      ? canonicalDocuments.map((document) => this.mapCanonicalDocumentToDriverDocument(document))
      : legacyDocuments;

    return buildSuccessResponse(
      'Operator documents retrieved successfully.',
      documents.map((document) => toDriverDocumentResponse(document)),
    );
  }

  async updateDocument(
    driverId: string,
    documentId: string,
    dto: UpdateDriverDocumentDto,
    principal?: CurrentPrincipal,
  ) {
    await this.findActiveDriverById(driverId);
    const canonicalDriver = await this.findCanonicalDriverById(driverId);
    const canonicalDocument = await this.findCanonicalCredentialForDriver(driverId, documentId);

    if (canonicalDriver && canonicalDocument) {
      const response = await this.workforceCredentialService.updateCredential(
        documentId,
        this.buildUpdateCredentialDto(canonicalDocument, dto),
        principal,
      );

      return buildSuccessResponse(
        'Operator document updated successfully.',
        this.mapCanonicalDocumentToDriverDocument(response.data),
      );
    }

    await this.findDriverDocument(driverId, documentId);

    const document = await this.prismaService.$transaction(async (transaction) => {
      const updated = await transaction.driverDocument.update({
        where: { id: documentId },
        data: {
          ...(dto.documentType !== undefined ? { documentType: dto.documentType } : {}),
          ...(dto.documentNumber !== undefined ? { documentNumber: dto.documentNumber } : {}),
          ...(dto.issuedAt !== undefined
            ? { issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null }
            : {}),
          ...(dto.expiresAt !== undefined
            ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
            : {}),
          ...(dto.verificationStatus !== undefined
            ? { verificationStatus: dto.verificationStatus }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
        select: DRIVER_DOCUMENT_SELECT,
      });

      await this.recalculateComplianceStatus(transaction, driverId);

      return updated;
    });

    return buildSuccessResponse(
      'Operator document updated successfully.',
      toDriverDocumentResponse(document),
    );
  }

  async updateStatus(id: string, principal: CurrentPrincipal, dto: UpdateDriverStatusDto) {
    const driver = await this.findActiveDriverById(id);
    this.ensureValidStatusTransition(dto.statusCategory, dto.newValue);

    const canonicalDriver = await this.findCanonicalDriverById(id);
    if (canonicalDriver && dto.statusCategory !== DriverStatusCategory.ONBOARDING_STATUS) {
      await this.workforceStatusService.updateStatus(
        id,
        this.buildWorkforceStatusDto(dto),
        principal,
      );

      const refreshedCanonicalDriver = await this.findCanonicalDriverById(id);

      return buildSuccessResponse(
        'Operator status updated successfully.',
        this.toCompatibilityDriverResponse(driver, refreshedCanonicalDriver),
      );
    }

    const previousValue = this.getDriverStatusValue(driver, dto.statusCategory);

    if (previousValue === dto.newValue) {
      throw new BadRequestException('Operator status is already set to the requested value.');
    }

    const data = this.buildDriverStatusUpdate(dto.statusCategory, dto.newValue);

    const updatedDriver = await this.prismaService.$transaction(async (transaction) => {
      const updated = await transaction.driver.update({
        where: { id },
        data,
        select: DRIVER_SELECT,
      });

      await transaction.driverStatusHistory.create({
        data: {
          driverId: id,
          statusCategory: dto.statusCategory,
          previousValue,
          newValue: dto.newValue,
          changedByUserId: principal.userId,
          reason: dto.reason,
        },
      });

      return updated;
    });

    await this.auditService.record({
      action: 'operator.status.update',
      entityType: 'operator',
      entityId: updatedDriver.id,
      organizationId: updatedDriver.organizationId,
      actorUserId: principal.userId,
      summary: `Operator ${updatedDriver.driverCode} ${dto.statusCategory.toLowerCase()} changed from ${previousValue} to ${dto.newValue}.`,
      metadata: {
        statusCategory: dto.statusCategory,
        previousValue,
        newValue: dto.newValue,
        reason: dto.reason ?? null,
      },
    });

    // TODO(universal-events): publish people.* canonical event names directly once downstream consumers stop depending on operator.* compatibility.
    await this.domainEventsService.publish({
      organizationId: updatedDriver.organizationId,
      eventType: 'operator.status.changed',
      aggregateType: 'operator',
      aggregateId: updatedDriver.id,
      triggeredByUserId: principal.userId,
      payload: {
        notification: {
          category: NotificationCategory.DRIVER,
          severity:
            dto.newValue === DriverOperationalStatus.SUSPENDED ||
            dto.newValue === DriverOperationalStatus.BLOCKED
              ? NotificationSeverity.CRITICAL
              : NotificationSeverity.INFO,
          title: 'Operator status changed',
          message: `Operator ${updatedDriver.driverCode} status changed to ${dto.newValue.toLowerCase().replaceAll('_', ' ')}.`,
          actionUrl: `/operators/${updatedDriver.id}`,
          entityType: 'operator',
          entityId: updatedDriver.id,
          metadata: {
            statusCategory: dto.statusCategory,
            previousValue,
            newValue: dto.newValue,
            reason: dto.reason ?? null,
          },
        },
        recipients: {
          userIds: updatedDriver.userId ? [updatedDriver.userId] : [],
          permissionCodes: ['driver.manage'],
        },
      },
    });

    if (
      dto.statusCategory === DriverStatusCategory.COMPLIANCE_STATUS &&
      (dto.newValue === DriverComplianceStatus.NON_COMPLIANT ||
        dto.newValue === DriverComplianceStatus.EXPIRED ||
        dto.newValue === DriverComplianceStatus.UNDER_REVIEW)
    ) {
      // TODO(universal-events): migrate this taxi-era operator compliance signal to a people/workforce canonical event name.
      await this.domainEventsService.publish({
        organizationId: updatedDriver.organizationId,
        eventType: 'operator.compliance.alert',
        aggregateType: 'operator',
        aggregateId: updatedDriver.id,
        triggeredByUserId: principal.userId,
        payload: {
          notification: {
            category: NotificationCategory.COMPLIANCE,
            severity: NotificationSeverity.WARNING,
            title: 'Operator compliance alert',
            message: `Operator ${updatedDriver.driverCode} requires compliance attention.`,
            actionUrl: `/operators/${updatedDriver.id}`,
            entityType: 'operator',
            entityId: updatedDriver.id,
            metadata: {
              statusCategory: dto.statusCategory,
              newValue: dto.newValue,
            },
          },
          recipients: {
            userIds: updatedDriver.userId ? [updatedDriver.userId] : [],
            permissionCodes: ['driver.manage'],
          },
        },
      });
    }

    return buildSuccessResponse(
      'Operator status updated successfully.',
      this.toDriverResponseWithEligibility(updatedDriver),
    );
  }

  async getStatusHistory(driverId: string) {
    await this.findActiveDriverById(driverId);

    const [legacyHistory, canonicalHistory] = await Promise.all([
      this.prismaService.driverStatusHistory.findMany({
        where: { driverId },
        select: DRIVER_STATUS_HISTORY_SELECT,
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prismaService.workforceStatusHistory.findMany({
        where: { workforceMemberId: driverId },
        select: WORKFORCE_STATUS_HISTORY_SELECT,
        orderBy: [{ effectiveAt: 'desc' }],
      }),
    ]);

    const history = this.hasCanonicalParity(
      legacyHistory.map((entry) => entry.id),
      canonicalHistory.map((entry) => entry.id),
    )
      ? canonicalHistory.map((entry) => this.mapCanonicalStatusHistoryToDriverHistory(entry))
      : legacyHistory;

    return buildSuccessResponse(
      'Operator status history retrieved successfully.',
      history.map((entry) => toDriverStatusHistoryResponse(entry)),
    );
  }

  async getParitySummary(organizationId?: string) {
    const [
      activeDrivers,
      activeWorkforceMembers,
      archivedDrivers,
      archivedWorkforceMembers,
      driverDocuments,
      credentialDocuments,
      driverStatuses,
      workforceStatuses,
    ] =
      await Promise.all([
        this.prismaService.driver.findMany({
          where: {
            deletedAt: null,
            ...(organizationId ? { organizationId } : {}),
          },
          select: DRIVER_SELECT,
        }),
        this.prismaService.workforceMember.findMany({
          where: {
            deletedAt: null,
            ...(organizationId ? { organizationId } : {}),
          },
          select: WORKFORCE_MEMBER_SELECT,
        }),
        this.prismaService.driver.findMany({
          where: {
            deletedAt: { not: null },
            ...(organizationId ? { organizationId } : {}),
          },
          select: { id: true },
        }),
        this.prismaService.workforceMember.findMany({
          where: {
            deletedAt: { not: null },
            ...(organizationId ? { organizationId } : {}),
          },
          select: { id: true },
        }),
        this.prismaService.driverDocument.findMany({
          where: organizationId ? { driver: { organizationId } } : undefined,
          select: { id: true },
        }),
        this.prismaService.credentialDocument.findMany({
          where: organizationId ? { organizationId } : undefined,
          select: { id: true },
        }),
        this.prismaService.driverStatusHistory.findMany({
          where: organizationId ? { driver: { organizationId } } : undefined,
          select: { id: true },
        }),
        this.prismaService.workforceStatusHistory.findMany({
          where: organizationId ? { organizationId } : undefined,
          select: { id: true },
        }),
      ]);

    const driverIds = activeDrivers.map((item) => item.id);
    const workforceIds = activeWorkforceMembers.map((item) => item.id);
    const archivedDriverIds = archivedDrivers.map((item) => item.id);
    const archivedWorkforceIds = archivedWorkforceMembers.map((item) => item.id);
    const workforceIdSet = new Set(workforceIds);
    const archivedDriverIdSet = new Set(archivedDriverIds);
    const archivedWorkforceIdSet = new Set(archivedWorkforceIds);
    const workforceById = new Map(activeWorkforceMembers.map((item) => [item.id, item]));
    const linkedReadMismatchIds = activeDrivers
      .filter((driver) => {
        const workforceMember = workforceById.get(driver.id);
        return workforceMember
          ? this.getLinkedReadMismatchReasons(driver, workforceMember).length > 0
          : false;
      })
      .map((driver) => driver.id);
    const extensionCoverage = activeDrivers.reduce(
      (accumulator, driver) => {
        const workforceMember = workforceById.get(driver.id);
        if (!workforceMember) {
          return accumulator;
        }

        const compatibilityMetadata = this.readCompatibilityMetadata(workforceMember.metadata);
        const compatibilityProfile = this.readLinkedCompatibilityProfile(
          driver,
          workforceMember,
          compatibilityMetadata,
        );
        const licenseAuthorizationCount = workforceMember.authorizations.length;
        const hasProfileExtension = workforceMember.profileExtension !== null;
        const selectedAuthorization =
          licenseAuthorizationCount === 1 ? workforceMember.authorizations[0] : null;
        const hasPartialAuthorization =
          selectedAuthorization !== null &&
          (selectedAuthorization.identifierValue === null ||
            selectedAuthorization.issuedAt === null ||
            selectedAuthorization.expiresAt === null);

        this.recordFieldCoverage(
          accumulator.joinedAt,
          compatibilityProfile.joinedAtClassification,
          driver.id,
        );
        this.recordFieldCoverage(
          accumulator.licenseNumber,
          compatibilityProfile.licenseNumberClassification,
          driver.id,
        );
        this.recordFieldCoverage(
          accumulator.licenseIssuedAt,
          compatibilityProfile.licenseIssuedAtClassification,
          driver.id,
        );
        this.recordFieldCoverage(
          accumulator.licenseExpiresAt,
          compatibilityProfile.licenseExpiresAtClassification,
          driver.id,
        );

        if (!hasProfileExtension) {
          accumulator.missingProfileExtensionIds.push(driver.id);
        }

        if (licenseAuthorizationCount === 0) {
          accumulator.missingAuthorizationIds.push(driver.id);
        }

        if (hasPartialAuthorization) {
          accumulator.partialAuthorizationIds.push(driver.id);
        }

        return accumulator;
      },
      {
        joinedAt: this.createFieldCoverageSummary(),
        licenseNumber: this.createFieldCoverageSummary(),
        licenseIssuedAt: this.createFieldCoverageSummary(),
        licenseExpiresAt: this.createFieldCoverageSummary(),
        missingProfileExtensionIds: [] as string[],
        licenseAmbiguousIds: [] as string[],
        missingAuthorizationIds: [] as string[],
        partialAuthorizationIds: [] as string[],
      },
    );

    extensionCoverage.licenseAmbiguousIds = [
      ...new Set([
        ...extensionCoverage.licenseNumber.ambiguousIds,
        ...extensionCoverage.licenseIssuedAt.ambiguousIds,
        ...extensionCoverage.licenseExpiresAt.ambiguousIds,
      ]),
    ];

    return buildSuccessResponse('Operator compatibility parity retrieved successfully.', {
      organizationId: organizationId ?? null,
      generatedAt: new Date().toISOString(),
      writeOwnership: {
        profileUpdate: 'workforce-when-canonical-row-exists',
        statusUpdate: 'workforce-when-status-category-is-canonical',
        documentCreate: 'credential-document-when-canonical-row-exists',
        documentUpdate: 'credential-document-when-canonical-linkage-exists',
        create: 'workforce-with-legacy-driver-compatibility-index',
        archive: 'workforce-when-canonical-row-exists',
        extensionAlignment:
          'workforce-profile-extensions-and-license-authorizations-are-now-the-primary-write-targets-for-joinedAt-and-license-fields-on-canonical-driver-write-paths-with-metadata-kept-as-fallback-sync',
      },
      visibilityOwnership: {
        membership: 'legacy-driver-row',
        linkedLifecycleGate: 'canonical-workforce-deletedAt',
        linkedStatusFilters: 'compatibility-shaped-values-from-canonical-workforce-state',
        linkedSearchFields:
          'compatibility-shaped-values-from-canonical-workforce-and-compatibility-metadata',
      },
      linkedReadOwnership: {
        canonicalDerivedFields: [
          'organizationId',
          'employeeId',
          'userId',
          'driverCode',
          'firstName',
          'lastName',
          'workEmail',
          'phoneNumber',
          'operationalStatus',
          'complianceStatus',
          'assignmentStatus',
          'createdAt',
          'updatedAt',
        ],
        legacyDerivedFields: ['onboardingStatus', 'suspendedAt', 'deactivatedAt'],
        compatibilityComposedFields: [
          'licenseNumber',
          'licenseIssuedAt',
          'licenseExpiresAt',
          'joinedAt',
          'isEligibleForAssignment',
        ],
        deferredFields: [
          'isEligibleForAssignment',
        ],
        extensionBackedPreferredFields: [
          'joinedAt',
          'licenseNumber',
          'licenseIssuedAt',
          'licenseExpiresAt',
        ],
      },
      compatibilityIndexing: {
        membershipArtifact: 'legacy-driver-row',
        linkageMechanism: 'shared-id-between-drivers-and-workforce-members',
        createMode: 'canonical-coupled-create',
        lifecycleVisibilityArtifact: 'legacy-driver-row',
        linkedRecordCount: driverIds.filter((id) => workforceIdSet.has(id)).length,
        missingCanonicalIndexIds: driverIds
          .filter((id) => !workforceIdSet.has(id))
          .slice(0, 25),
        rollbackSafety:
          'Operator compatibility indexing is persisted inside the same transaction as workforce creation so partial create drift is not committed.',
      },
      creationStrategy: {
        owner: 'workforce',
        rationale:
          'Operator create now uses workforce as the canonical owner while persisting a same-ID legacy driver row as the explicit compatibility index for /drivers membership, scoping, and search behavior.',
      },
      lifecycleStrategy: {
        archiveOwner: 'workforce-when-shared-id-linkage-exists',
        fallbackOwner: 'legacy-driver-when-no-canonical-linkage-exists',
        driftPrevention:
          'Archive now fails early if canonical workforce is already archived while the legacy driver compatibility row is still active.',
      },
      lifecycleAlignment: {
        activeDriverMissingActiveWorkforce: driverIds.filter((id) => !workforceIdSet.has(id)).slice(0, 25),
        activeWorkforceMissingActiveDriver: workforceIds.filter((id) => !driverIds.includes(id)).slice(0, 25),
        archivedDriverWithActiveWorkforce: archivedDriverIds.filter((id) => workforceIdSet.has(id)).slice(0, 25),
        archivedWorkforceWithActiveDriver: archivedWorkforceIds.filter((id) => driverIds.includes(id)).slice(0, 25),
        archivedDriverWithArchivedWorkforceCount: archivedDriverIds.filter((id) => archivedWorkforceIdSet.has(id)).length,
        archivedWorkforceWithArchivedDriverCount: archivedWorkforceIds.filter((id) => archivedDriverIdSet.has(id)).length,
      },
      linkedReadAlignment: {
        mismatchedLinkedRecordIds: linkedReadMismatchIds.slice(0, 25),
        mismatchedLinkedRecordCount: linkedReadMismatchIds.length,
        guardedFields: ['organizationId', 'employeeId', 'userId', 'joinedAt', 'licenseNumber'],
        extensionCoverage: {
          joinedAt: {
            extensionOwnedCount: extensionCoverage.joinedAt.extensionOwnedCount,
            extensionBackedButFallbackUsedCount:
              extensionCoverage.joinedAt.extensionBackedButFallbackUsedCount,
            metadataFallbackCount: extensionCoverage.joinedAt.metadataFallbackCount,
            legacyFallbackCount: extensionCoverage.joinedAt.legacyFallbackCount,
            ambiguousCount: extensionCoverage.joinedAt.ambiguousCount,
            missingProfileExtensionCount: extensionCoverage.missingProfileExtensionIds.length,
            extensionOwnedIds: extensionCoverage.joinedAt.extensionOwnedIds.slice(0, 25),
            extensionBackedButFallbackUsedIds:
              extensionCoverage.joinedAt.extensionBackedButFallbackUsedIds.slice(0, 25),
            metadataFallbackIds: extensionCoverage.joinedAt.metadataFallbackIds.slice(0, 25),
            legacyFallbackIds: extensionCoverage.joinedAt.legacyFallbackIds.slice(0, 25),
            ambiguousIds: extensionCoverage.joinedAt.ambiguousIds.slice(0, 25),
            missingProfileExtensionIds: extensionCoverage.missingProfileExtensionIds.slice(0, 25),
          },
          license: {
            number: {
              extensionOwnedCount: extensionCoverage.licenseNumber.extensionOwnedCount,
              extensionBackedButFallbackUsedCount:
                extensionCoverage.licenseNumber.extensionBackedButFallbackUsedCount,
              metadataFallbackCount: extensionCoverage.licenseNumber.metadataFallbackCount,
              legacyFallbackCount: extensionCoverage.licenseNumber.legacyFallbackCount,
              ambiguousCount: extensionCoverage.licenseNumber.ambiguousCount,
              missingExtensionCount: extensionCoverage.missingAuthorizationIds.length,
              extensionOwnedIds: extensionCoverage.licenseNumber.extensionOwnedIds.slice(0, 25),
              extensionBackedButFallbackUsedIds:
                extensionCoverage.licenseNumber.extensionBackedButFallbackUsedIds.slice(0, 25),
              metadataFallbackIds: extensionCoverage.licenseNumber.metadataFallbackIds.slice(0, 25),
              legacyFallbackIds: extensionCoverage.licenseNumber.legacyFallbackIds.slice(0, 25),
              ambiguousIds: extensionCoverage.licenseNumber.ambiguousIds.slice(0, 25),
            },
            issuedAt: {
              extensionOwnedCount: extensionCoverage.licenseIssuedAt.extensionOwnedCount,
              extensionBackedButFallbackUsedCount:
                extensionCoverage.licenseIssuedAt.extensionBackedButFallbackUsedCount,
              metadataFallbackCount: extensionCoverage.licenseIssuedAt.metadataFallbackCount,
              legacyFallbackCount: extensionCoverage.licenseIssuedAt.legacyFallbackCount,
              ambiguousCount: extensionCoverage.licenseIssuedAt.ambiguousCount,
              missingExtensionCount: extensionCoverage.missingAuthorizationIds.length,
              extensionOwnedIds: extensionCoverage.licenseIssuedAt.extensionOwnedIds.slice(0, 25),
              extensionBackedButFallbackUsedIds:
                extensionCoverage.licenseIssuedAt.extensionBackedButFallbackUsedIds.slice(0, 25),
              metadataFallbackIds:
                extensionCoverage.licenseIssuedAt.metadataFallbackIds.slice(0, 25),
              legacyFallbackIds: extensionCoverage.licenseIssuedAt.legacyFallbackIds.slice(0, 25),
              ambiguousIds: extensionCoverage.licenseIssuedAt.ambiguousIds.slice(0, 25),
            },
            expiresAt: {
              extensionOwnedCount: extensionCoverage.licenseExpiresAt.extensionOwnedCount,
              extensionBackedButFallbackUsedCount:
                extensionCoverage.licenseExpiresAt.extensionBackedButFallbackUsedCount,
              metadataFallbackCount: extensionCoverage.licenseExpiresAt.metadataFallbackCount,
              legacyFallbackCount: extensionCoverage.licenseExpiresAt.legacyFallbackCount,
              ambiguousCount: extensionCoverage.licenseExpiresAt.ambiguousCount,
              missingExtensionCount: extensionCoverage.missingAuthorizationIds.length,
              extensionOwnedIds:
                extensionCoverage.licenseExpiresAt.extensionOwnedIds.slice(0, 25),
              extensionBackedButFallbackUsedIds:
                extensionCoverage.licenseExpiresAt.extensionBackedButFallbackUsedIds.slice(0, 25),
              metadataFallbackIds:
                extensionCoverage.licenseExpiresAt.metadataFallbackIds.slice(0, 25),
              legacyFallbackIds:
                extensionCoverage.licenseExpiresAt.legacyFallbackIds.slice(0, 25),
              ambiguousIds: extensionCoverage.licenseExpiresAt.ambiguousIds.slice(0, 25),
            },
            ambiguousAuthorizationCount: extensionCoverage.licenseAmbiguousIds.length,
            missingAuthorizationCount: extensionCoverage.missingAuthorizationIds.length,
            partialAuthorizationCount: extensionCoverage.partialAuthorizationIds.length,
            ambiguousAuthorizationIds: extensionCoverage.licenseAmbiguousIds.slice(0, 25),
            missingAuthorizationIds: extensionCoverage.missingAuthorizationIds.slice(0, 25),
            partialAuthorizationIds: extensionCoverage.partialAuthorizationIds.slice(0, 25),
          },
        },
      },
      fallbackCases: {
        archiveFallback: 'legacy-driver-when-no-canonical-linkage-exists',
        statusFallback: 'legacy-driver-for-onboarding-status-or-missing-canonical-linkage',
        documentFallback:
          'legacy-driver-document-when-no-canonical-credential-linkage-exists',
        visibilityFallback:
          'legacy-driver-membership-index-remains-authoritative, but linked records no longer remain visible when canonical workforce is archived',
        compatibilityFieldFallback:
          'joinedAt now prefers workforce profile extensions and license* now prefers workforce authorizations; both still fall back to compatibility metadata and then legacy driver values when extension data is missing or ambiguous',
        extensionWriteFallback:
          'canonical driver writes now update profile extensions and LICENSE authorizations first, then synchronize compatibility metadata as explicit fallback state only when the workforce-owned path is active and ambiguity checks pass',
      },
      scopes: [
        this.buildParityScope(
          'drivers->workforce-members',
          driverIds,
          workforceIds,
          ['Driver compatibility expects shared IDs for canonical workforce rows.'],
        ),
        this.buildParityScope(
          'driver-documents->credential-documents',
          driverDocuments.map((item) => item.id),
          credentialDocuments.map((item) => item.id),
          ['Driver document compatibility uses canonical credential documents when shared-key parity exists.'],
        ),
        this.buildParityScope(
          'driver-status-history->workforce-status-history',
          driverStatuses.map((item) => item.id),
          workforceStatuses.map((item) => item.id),
          ['Onboarding semantics remain legacy-owned; workforce history parity is used only when shared-key backfill coverage exists.'],
        ),
      ],
    });
  }

  private async ensureOrganizationExists(organizationId: string) {
    const organization = await this.prismaService.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }
  }

  private async validateDriverLinks(
    organizationId: string,
    employeeId?: string,
    userId?: string,
  ) {
    if (employeeId) {
      const employee = await this.prismaService.employee.findFirst({
        where: {
          id: employeeId,
          organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found.');
      }
    }

    if (userId) {
      const user = await this.prismaService.user.findFirst({
        where: {
          id: userId,
          organizationId,
          deletedAt: null,
          status: {
            in: [UserStatus.ACTIVE, UserStatus.INVITED],
          },
        },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException('User not found.');
      }
    }
  }

  private async ensureDriverCodeIsAvailable(
    organizationId: string,
    driverCode: string,
    driverIdToExclude?: string,
  ) {
    const existingDriver = await this.prismaService.driver.findFirst({
      where: {
        organizationId,
        driverCode,
        ...(driverIdToExclude ? { id: { not: driverIdToExclude } } : {}),
      },
      select: { id: true },
    });

    if (existingDriver) {
      throw new ConflictException('An operator with the provided code already exists.');
    }
  }

  private async ensureLicenseNumberIsAvailable(
    organizationId: string,
    licenseNumber: string,
    driverIdToExclude?: string,
  ) {
    const existingDriver = await this.prismaService.driver.findFirst({
      where: {
        organizationId,
        licenseNumber,
        ...(driverIdToExclude ? { id: { not: driverIdToExclude } } : {}),
      },
      select: { id: true },
    });

    if (existingDriver) {
      throw new ConflictException('An operator with the provided licenseNumber already exists.');
    }
  }

  private async ensureWorkforceCompatibilityIndexIsAvailable(dto: CreateDriverDto) {
    const conflictingWorkforceMember = await this.prismaService.workforceMember.findFirst({
      where: {
        OR: [
          {
            organizationId: dto.organizationId,
            workerCode: dto.driverCode,
          },
          ...(dto.employeeId ? [{ employeeId: dto.employeeId }] : []),
          ...(dto.userId ? [{ userId: dto.userId }] : []),
        ],
      },
      select: {
        id: true,
        organizationId: true,
        workerCode: true,
        employeeId: true,
        userId: true,
      },
    });

    if (!conflictingWorkforceMember) {
      return;
    }

    if (
      conflictingWorkforceMember.organizationId === dto.organizationId &&
      conflictingWorkforceMember.workerCode === dto.driverCode
    ) {
      throw new ConflictException('A workforce member with the provided driverCode already exists.');
    }

    if (dto.employeeId && conflictingWorkforceMember.employeeId === dto.employeeId) {
      throw new ConflictException(
        'The provided employeeId is already linked to a workforce member.',
      );
    }

    if (dto.userId && conflictingWorkforceMember.userId === dto.userId) {
      throw new ConflictException('The provided userId is already linked to a workforce member.');
    }
  }

  private async findActiveDriverById(id: string) {
    const driver = await this.prismaService.driver.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: DRIVER_SELECT,
    });

    if (!driver) {
      throw new NotFoundException('Operator not found.');
    }

    return driver;
  }

  private async findDriverByIdIncludingArchived(id: string) {
    const driver = await this.prismaService.driver.findFirst({
      where: { id },
      select: DRIVER_SELECT,
    });

    if (!driver) {
      throw new NotFoundException('Operator not found.');
    }

    return driver;
  }

  private async findDriverDocument(driverId: string, documentId: string) {
    const document = await this.prismaService.driverDocument.findFirst({
      where: {
        id: documentId,
        driverId,
      },
      select: { id: true },
    });

    if (!document) {
      throw new NotFoundException('Operator document not found.');
    }
  }

  private resolveInitialComplianceStatus(dto: CreateDriverDto) {
    if (dto.complianceStatus) {
      return dto.complianceStatus;
    }

    if (dto.licenseExpiresAt && new Date(dto.licenseExpiresAt) < new Date()) {
      return DriverComplianceStatus.EXPIRED;
    }

    return DriverComplianceStatus.PENDING;
  }

  private toDriverResponseWithEligibility(
    driver: Omit<DriverResponse, 'isEligibleForAssignment'>,
  ) {
    return toDriverResponse(driver, this.evaluateEligibility(driver));
  }

  private toCompatibilityDriverResponse(
    legacyDriver: Omit<DriverResponse, 'isEligibleForAssignment'>,
    canonicalDriver: WorkforceMemberResponse | null,
  ) {
    if (!canonicalDriver) {
      return this.toDriverResponseWithEligibility(legacyDriver);
    }

    const compatibilityMetadata = this.readCompatibilityMetadata(canonicalDriver.metadata);
    const compatibilityProfile = this.readLinkedCompatibilityProfile(
      legacyDriver,
      canonicalDriver,
      compatibilityMetadata,
    );
    const driver = {
      ...legacyDriver,
      organizationId: canonicalDriver.organizationId,
      employeeId: canonicalDriver.employeeId,
      userId: canonicalDriver.userId,
      driverCode: canonicalDriver.workerCode ?? legacyDriver.driverCode,
      firstName: canonicalDriver.firstName,
      lastName: canonicalDriver.lastName,
      workEmail: canonicalDriver.workEmail,
      phoneNumber: canonicalDriver.phoneNumber,
      licenseNumber: compatibilityProfile.licenseNumber,
      licenseIssuedAt: compatibilityProfile.licenseIssuedAt,
      licenseExpiresAt: compatibilityProfile.licenseExpiresAt,
      onboardingStatus:
        this.readDriverOnboardingStatus(compatibilityMetadata) ?? legacyDriver.onboardingStatus,
      operationalStatus: this.mapWorkforceOperationalStatusToDriver(canonicalDriver.operationalStatus),
      complianceStatus: this.mapWorkforceComplianceStatusToDriver(canonicalDriver.complianceStatus),
      assignmentStatus: this.mapWorkforceAvailabilityStatusToDriver(canonicalDriver.availabilityStatus),
      joinedAt: compatibilityProfile.joinedAt,
      createdAt: canonicalDriver.createdAt,
      updatedAt: canonicalDriver.updatedAt,
    };

    return this.toDriverResponseWithEligibility(driver);
  }

  private getLinkedReadMismatchReasons(
    legacyDriver: Omit<DriverResponse, 'isEligibleForAssignment'>,
    canonicalDriver: WorkforceMemberResponse,
  ) {
    const reasons: string[] = [];

    if (legacyDriver.organizationId !== canonicalDriver.organizationId) {
      reasons.push('organization linkage mismatch');
    }

    if ((legacyDriver.employeeId ?? null) !== (canonicalDriver.employeeId ?? null)) {
      reasons.push('employee linkage mismatch');
    }

    if ((legacyDriver.userId ?? null) !== (canonicalDriver.userId ?? null)) {
      reasons.push('user linkage mismatch');
    }

    const compatibilityMetadata = this.readCompatibilityMetadata(canonicalDriver.metadata);
    const extensionProfile = this.readLinkedExtensionProfile(canonicalDriver, compatibilityMetadata);
    const metadataJoinedAt = this.readDate(compatibilityMetadata, 'joinedAt');
    const metadataLicenseNumber = this.readNullableString(compatibilityMetadata, 'licenseNumber');

    if (extensionProfile.licenseSource === 'ambiguous-authorization') {
      reasons.push('ambiguous canonical license authorization');
    }

    if (
      extensionProfile.joinedAtClassification === 'extensionOwned' &&
      metadataJoinedAt &&
      extensionProfile.joinedAt &&
      metadataJoinedAt.getTime() !== extensionProfile.joinedAt.getTime()
    ) {
      reasons.push('extension-owned joinedAt metadata drift');
    }

    if (
      extensionProfile.licenseNumberClassification === 'extensionOwned' &&
      metadataLicenseNumber !== null &&
      extensionProfile.licenseNumber !== null &&
      metadataLicenseNumber !== extensionProfile.licenseNumber
    ) {
      reasons.push('extension-owned licenseNumber metadata drift');
    }

    if (extensionProfile.licenseNumber === null) {
      reasons.push('missing canonical extension-backed licenseNumber');
    }

    if (extensionProfile.joinedAt === null) {
      reasons.push('missing canonical extension-backed joinedAt');
    }

    return reasons;
  }

  private matchesDriverFilters(driver: DriverResponse, query: QueryDriversDto) {
    const search = query.search?.trim().toLowerCase();

    if (query.onboardingStatus && driver.onboardingStatus !== query.onboardingStatus) {
      return false;
    }

    if (query.operationalStatus && driver.operationalStatus !== query.operationalStatus) {
      return false;
    }

    if (query.complianceStatus && driver.complianceStatus !== query.complianceStatus) {
      return false;
    }

    if (query.assignmentStatus && driver.assignmentStatus !== query.assignmentStatus) {
      return false;
    }

    if (!search) {
      return true;
    }

    return [
      driver.driverCode,
      driver.firstName,
      driver.lastName,
      driver.workEmail,
      driver.licenseNumber,
    ]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .some((value) => value.toLowerCase().includes(search));
  }

  private canRouteProfileUpdateToCanonical(dto: UpdateDriverDto) {
    return (
      dto.organizationId === undefined &&
      dto.employeeId === undefined &&
      dto.userId === undefined &&
      dto.driverCode === undefined
    );
  }

  private buildWorkforceUpdateDto(
    legacyDriver: Omit<DriverResponse, 'isEligibleForAssignment'>,
    canonicalDriver: WorkforceMemberResponse,
    dto: UpdateDriverDto,
  ): UpdateWorkforceMemberDto {
    const existingMetadata = this.readCompatibilityMetadata(canonicalDriver.metadata);
    const nextFirstName = dto.firstName ?? canonicalDriver.firstName;
    const nextLastName = dto.lastName ?? canonicalDriver.lastName;

    return {
      ...(dto.organizationId !== undefined ? { organizationId: dto.organizationId } : {}),
      ...(dto.employeeId !== undefined ? { employeeId: dto.employeeId } : {}),
      ...(dto.userId !== undefined ? { userId: dto.userId } : {}),
      ...(dto.driverCode !== undefined ? { workerCode: dto.driverCode } : {}),
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.firstName !== undefined || dto.lastName !== undefined
        ? { displayName: `${nextFirstName} ${nextLastName}`.trim() }
        : {}),
      ...(dto.workEmail !== undefined ? { workEmail: dto.workEmail } : {}),
      ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
      ...(dto.operationalStatus !== undefined
        ? { operationalStatus: this.mapDriverOperationalStatusToWorkforce(dto.operationalStatus) }
        : {}),
      ...(dto.complianceStatus !== undefined
        ? { complianceStatus: this.mapDriverComplianceStatusToWorkforce(dto.complianceStatus) }
        : {}),
      ...(dto.assignmentStatus !== undefined
        ? { availabilityStatus: this.mapDriverAssignmentStatusToWorkforce(dto.assignmentStatus) }
        : {}),
      metadata: this.buildCompatibilityMetadata(existingMetadata, legacyDriver, dto),
    };
  }

  private buildWorkforceStatusDto(dto: UpdateDriverStatusDto): UpdateWorkforceStatusDto {
    return {
      category: this.mapDriverStatusCategoryToWorkforce(dto.statusCategory),
      nextValue: dto.newValue,
      reason: dto.reason,
      metadata: {
        compatibilitySource: 'drivers',
        legacyStatusCategory: dto.statusCategory,
      },
    };
  }

  private buildCreateCredentialDto(
    dto: CreateDriverDocumentDto,
    organizationId: string,
  ): CreateCredentialDocumentDto {
    return {
      organizationId,
      documentType: this.mapLegacyDriverDocumentTypeToCredential(dto.documentType),
      title: dto.documentType.replaceAll('_', ' '),
      documentNumber: dto.documentNumber,
      issuedAt: dto.issuedAt,
      expiresAt: dto.expiresAt,
      verificationStatus: this.mapLegacyVerificationStatusToCredential(
        dto.verificationStatus ?? DocumentVerificationStatus.PENDING,
      ),
      metadata: dto.notes ? { notes: dto.notes, compatibilitySource: 'drivers' } : { compatibilitySource: 'drivers' },
    };
  }

  private buildUpdateCredentialDto(
    existing: CredentialDocumentResponse,
    dto: UpdateDriverDocumentDto,
  ) {
    const metadata = this.readCompatibilityMetadata(existing.metadata);

    return {
      ...(dto.documentType !== undefined
        ? { documentType: this.mapLegacyDriverDocumentTypeToCredential(dto.documentType) }
        : {}),
      ...(dto.documentType !== undefined
        ? { title: dto.documentType.replaceAll('_', ' ') }
        : {}),
      ...(dto.documentNumber !== undefined ? { documentNumber: dto.documentNumber } : {}),
      ...(dto.issuedAt !== undefined ? { issuedAt: dto.issuedAt } : {}),
      ...(dto.expiresAt !== undefined ? { expiresAt: dto.expiresAt } : {}),
      ...(dto.verificationStatus !== undefined
        ? {
            verificationStatus: this.mapLegacyVerificationStatusToCredential(
              dto.verificationStatus,
            ),
          }
        : {}),
      metadata:
        dto.notes !== undefined
          ? {
              ...(metadata ?? {}),
              notes: dto.notes,
              compatibilitySource: 'drivers',
            }
          : undefined,
    };
  }

  private buildCompatibilityMetadata(
    metadata: Record<string, unknown> | null,
    legacyDriver: Omit<DriverResponse, 'isEligibleForAssignment'>,
    dto: UpdateDriverDto,
  ): Record<string, unknown> {
    return {
      ...(metadata ?? {}),
      onboardingStatus:
        dto.onboardingStatus ??
        this.readDriverOnboardingStatus(metadata) ??
        legacyDriver.onboardingStatus,
      writeOwner: 'workforce',
      compatibilitySource: 'drivers',
    };
  }

  private readLinkedCompatibilityProfile(
    legacyDriver: Omit<DriverResponse, 'isEligibleForAssignment'>,
    canonicalDriver: WorkforceMemberResponse,
    compatibilityMetadata: Record<string, unknown> | null,
  ) {
    const extensionProfile = this.readLinkedExtensionProfile(canonicalDriver, compatibilityMetadata);

    return {
      licenseNumber: extensionProfile.licenseNumber ?? legacyDriver.licenseNumber,
      licenseIssuedAt: extensionProfile.licenseIssuedAt ?? legacyDriver.licenseIssuedAt,
      licenseExpiresAt: extensionProfile.licenseExpiresAt ?? legacyDriver.licenseExpiresAt,
      joinedAt: extensionProfile.joinedAt ?? legacyDriver.joinedAt,
      source: extensionProfile.source,
      joinedAtSource: extensionProfile.joinedAtSource,
      licenseSource: extensionProfile.licenseSource,
      joinedAtClassification: extensionProfile.joinedAtClassification,
      licenseNumberClassification: extensionProfile.licenseNumberClassification,
      licenseIssuedAtClassification: extensionProfile.licenseIssuedAtClassification,
      licenseExpiresAtClassification: extensionProfile.licenseExpiresAtClassification,
      writeOwner:
        this.readNullableString(compatibilityMetadata, 'writeOwner') ??
        this.readNullableString(compatibilityMetadata, 'compatibilitySource') ??
        (canonicalDriver.id === legacyDriver.id ? 'workforce' : 'legacy-driver'),
    };
  }

  private readLinkedExtensionProfile(
    canonicalDriver: WorkforceMemberResponse,
    compatibilityMetadata: Record<string, unknown> | null,
  ) {
    const metadataLicenseNumber = this.readNullableString(compatibilityMetadata, 'licenseNumber');
    const metadataLicenseIssuedAt = this.readDate(compatibilityMetadata, 'licenseIssuedAt');
    const metadataLicenseExpiresAt = this.readDate(compatibilityMetadata, 'licenseExpiresAt');
    const metadataJoinedAt = this.readDate(compatibilityMetadata, 'joinedAt');
    const profileExtensionJoinedAt = canonicalDriver.profileExtension?.engagementStartDate ?? null;
    const hasAuthorizationAmbiguity = canonicalDriver.authorizations.length > 1;
    const selectedAuthorization =
      canonicalDriver.authorizations.length === 1 ? canonicalDriver.authorizations[0] : null;
    const extensionOwnership = this.readExtensionOwnershipMetadata(compatibilityMetadata);
    const profileExtensionMetadata = this.readCompatibilityMetadata(
      canonicalDriver.profileExtension?.metadata ?? null,
    );
    const authorizationMetadata = this.readCompatibilityMetadata(
      selectedAuthorization?.metadata ?? null,
    );
    const joinedAtOwned =
      profileExtensionJoinedAt !== null &&
      (extensionOwnership.joinedAt === 'workforce-profile-extension' ||
        this.readNullableString(
          this.readCompatibilityMetadata(profileExtensionMetadata?.extensionAlignment as Prisma.JsonValue | null),
          'ownership',
        ) === 'extension-first');
    const licenseOwned =
      selectedAuthorization?.identifierValue !== null &&
      (extensionOwnership.license === 'workforce-authorization' ||
        this.readNullableString(
          this.readCompatibilityMetadata(authorizationMetadata?.extensionAlignment as Prisma.JsonValue | null),
          'ownership',
        ) === 'extension-first');

    const joinedAt = profileExtensionJoinedAt ?? metadataJoinedAt;
    const joinedAtSource = profileExtensionJoinedAt
      ? 'workforce-profile-extension'
      : metadataJoinedAt
        ? 'canonical-compatibility-metadata'
        : 'missing';
    const joinedAtClassification = joinedAtOwned
      ? 'extensionOwned'
      : profileExtensionJoinedAt
        ? 'extensionBackedButFallbackUsed'
        : metadataJoinedAt
          ? 'metadataFallback'
          : 'legacyFallback';

    const licenseNumber = selectedAuthorization?.identifierValue ?? metadataLicenseNumber;
    const licenseIssuedAt = selectedAuthorization?.issuedAt ?? metadataLicenseIssuedAt;
    const licenseExpiresAt = selectedAuthorization?.expiresAt ?? metadataLicenseExpiresAt;
    const licenseSource = hasAuthorizationAmbiguity
      ? 'ambiguous-authorization'
      : selectedAuthorization
        ? 'workforce-authorization'
        : metadataLicenseNumber || metadataLicenseIssuedAt || metadataLicenseExpiresAt
          ? 'canonical-compatibility-metadata'
          : 'missing';
    const licenseNumberClassification = hasAuthorizationAmbiguity
      ? 'ambiguous'
      : licenseOwned
        ? 'extensionOwned'
        : selectedAuthorization?.identifierValue
          ? 'extensionBackedButFallbackUsed'
          : metadataLicenseNumber
            ? 'metadataFallback'
            : 'legacyFallback';
    const licenseIssuedAtClassification = hasAuthorizationAmbiguity
      ? 'ambiguous'
      : licenseOwned && selectedAuthorization?.issuedAt
        ? 'extensionOwned'
        : selectedAuthorization && metadataLicenseIssuedAt
          ? 'extensionBackedButFallbackUsed'
          : metadataLicenseIssuedAt
            ? 'metadataFallback'
            : 'legacyFallback';
    const licenseExpiresAtClassification = hasAuthorizationAmbiguity
      ? 'ambiguous'
      : licenseOwned && selectedAuthorization?.expiresAt
        ? 'extensionOwned'
        : selectedAuthorization && metadataLicenseExpiresAt
          ? 'extensionBackedButFallbackUsed'
          : metadataLicenseExpiresAt
            ? 'metadataFallback'
            : 'legacyFallback';

    const source =
      joinedAtSource === 'workforce-profile-extension' &&
      licenseSource === 'workforce-authorization'
        ? 'canonical-workforce-extensions'
        : joinedAtSource !== 'missing' || licenseSource !== 'missing'
          ? 'extension-or-metadata-fallback'
          : 'legacy-fallback';

    return {
      joinedAt,
      joinedAtSource,
      licenseNumber,
      licenseIssuedAt,
      licenseExpiresAt,
      licenseSource,
      joinedAtClassification,
      licenseNumberClassification,
      licenseIssuedAtClassification,
      licenseExpiresAtClassification,
      source,
    };
  }

  private readExtensionOwnershipMetadata(metadata: Record<string, unknown> | null) {
    const ownership = metadata?.extensionOwnership;

    if (!ownership || typeof ownership !== 'object' || Array.isArray(ownership)) {
      return {
        joinedAt: null as string | null,
        license: null as string | null,
      };
    }

    return {
      joinedAt:
        typeof (ownership as Record<string, unknown>).joinedAt === 'string'
          ? ((ownership as Record<string, unknown>).joinedAt as string)
          : null,
      license:
        typeof (ownership as Record<string, unknown>).license === 'string'
          ? ((ownership as Record<string, unknown>).license as string)
          : null,
    };
  }

  private createFieldCoverageSummary() {
    return {
      extensionOwnedCount: 0,
      extensionBackedButFallbackUsedCount: 0,
      metadataFallbackCount: 0,
      legacyFallbackCount: 0,
      ambiguousCount: 0,
      extensionOwnedIds: [] as string[],
      extensionBackedButFallbackUsedIds: [] as string[],
      metadataFallbackIds: [] as string[],
      legacyFallbackIds: [] as string[],
      ambiguousIds: [] as string[],
    };
  }

  private recordFieldCoverage(
    summary: ReturnType<DriversService['createFieldCoverageSummary']>,
    classification: string,
    id: string,
  ) {
    if (classification === 'extensionOwned') {
      summary.extensionOwnedCount += 1;
      summary.extensionOwnedIds.push(id);
      return;
    }

    if (classification === 'extensionBackedButFallbackUsed') {
      summary.extensionBackedButFallbackUsedCount += 1;
      summary.extensionBackedButFallbackUsedIds.push(id);
      return;
    }

    if (classification === 'metadataFallback') {
      summary.metadataFallbackCount += 1;
      summary.metadataFallbackIds.push(id);
      return;
    }

    if (classification === 'ambiguous') {
      summary.ambiguousCount += 1;
      summary.ambiguousIds.push(id);
      return;
    }

    summary.legacyFallbackCount += 1;
    summary.legacyFallbackIds.push(id);
  }

  private assertDriverCompatibilityExtensionAlignmentIsSafe(
    canonicalDriver: WorkforceMemberResponse,
    dto: UpdateDriverDto,
  ) {
    const touchesLicenseFields =
      dto.licenseNumber !== undefined ||
      dto.licenseIssuedAt !== undefined ||
      dto.licenseExpiresAt !== undefined;

    if (touchesLicenseFields && canonicalDriver.authorizations.length > 1) {
      throw new ConflictException(
        'Operator compatibility drift detected: multiple LICENSE authorizations exist, so license alignment cannot proceed safely through the canonical workforce write path.',
      );
    }
  }

  private buildCompatibilityIndexedWorkforceInput(
    driverId: string,
    dto: CreateDriverDto,
  ): CompatibilityIndexedWorkforceMemberInput {
    return {
      id: driverId,
      organizationId: dto.organizationId,
      employeeId: dto.employeeId,
      userId: dto.userId,
      workerCode: dto.driverCode,
      workerType: this.resolveWorkforceMemberType(dto),
      employmentModel: this.resolveWorkforceEmploymentModel(dto),
      firstName: dto.firstName,
      lastName: dto.lastName,
      displayName: `${dto.firstName} ${dto.lastName}`.trim(),
      workEmail: dto.workEmail,
      phoneNumber: dto.phoneNumber,
      operationalStatus: this.mapDriverOperationalStatusToCreateWorkforce(
        dto.operationalStatus ?? DriverOperationalStatus.INACTIVE,
      ),
      complianceStatus: this.mapDriverComplianceStatusToCreateWorkforce(
        this.resolveInitialComplianceStatus(dto),
      ),
      availabilityStatus: this.mapDriverAssignmentStatusToCreateWorkforce(
        dto.assignmentStatus ?? DriverAssignmentStatus.UNAVAILABLE,
      ),
      metadata: {
        compatibilitySource: 'drivers',
        writeOwner: 'workforce',
        onboardingStatus: dto.onboardingStatus ?? DriverOnboardingStatus.PENDING,
        compatibilityIndex: {
          source: 'drivers',
          membershipArtifact: 'legacy-driver-row',
          creationMode: 'canonical-coupled',
        },
      },
    };
  }

  private buildCompatibilityDriverCreateData(
    id: string,
    dto: CreateDriverDto,
  ): Prisma.DriverCreateInput {
    return {
      id,
      organization: { connect: { id: dto.organizationId } },
      ...(dto.employeeId ? { employee: { connect: { id: dto.employeeId } } } : {}),
      ...(dto.userId ? { user: { connect: { id: dto.userId } } } : {}),
      driverCode: dto.driverCode,
      firstName: dto.firstName,
      lastName: dto.lastName,
      workEmail: dto.workEmail,
      phoneNumber: dto.phoneNumber,
      licenseNumber: dto.licenseNumber,
      licenseIssuedAt: dto.licenseIssuedAt ? new Date(dto.licenseIssuedAt) : null,
      licenseExpiresAt: dto.licenseExpiresAt ? new Date(dto.licenseExpiresAt) : null,
      onboardingStatus: dto.onboardingStatus ?? DriverOnboardingStatus.PENDING,
      operationalStatus: dto.operationalStatus ?? DriverOperationalStatus.INACTIVE,
      complianceStatus: this.resolveInitialComplianceStatus(dto),
      assignmentStatus: dto.assignmentStatus ?? DriverAssignmentStatus.UNAVAILABLE,
      joinedAt: new Date(dto.joinedAt),
    };
  }

  private async listCanonicalDriverLifecycleStatesByIds(
    ids: string[],
  ): Promise<WorkforceMemberLifecycleResponse[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.prismaService.workforceMember.findMany({
      where: {
        id: { in: ids },
      },
      select: WORKFORCE_MEMBER_WITH_LIFECYCLE_SELECT,
    });
  }

  private async findCanonicalDriverLifecycleStateById(
    id: string,
  ): Promise<WorkforceMemberLifecycleResponse | null> {
    return this.prismaService.workforceMember.findFirst({
      where: { id },
      select: WORKFORCE_MEMBER_WITH_LIFECYCLE_SELECT,
    });
  }

  private async findCanonicalDriverById(id: string) {
    const driver = await this.findCanonicalDriverLifecycleStateById(id);
    return driver && driver.deletedAt === null ? driver : null;
  }

  private async findCanonicalCredentialForDriver(driverId: string, documentId: string) {
    return this.prismaService.credentialDocument.findFirst({
      where: {
        id: documentId,
        workforceMemberId: driverId,
      },
      select: CREDENTIAL_DOCUMENT_SELECT,
    });
  }

  private mapCanonicalDocumentToDriverDocument(
    document: CredentialDocumentResponse,
  ): DriverDocumentResponse {
    const metadata = this.readCompatibilityMetadata(document.metadata);

    return {
      id: document.id,
      driverId: document.workforceMemberId,
      documentType: this.mapCredentialDocumentTypeToLegacy(document.documentType),
      documentNumber: document.documentNumber,
      issuedAt: document.issuedAt,
      expiresAt: document.expiresAt,
      verificationStatus: this.mapCredentialVerificationStatusToLegacy(document.verificationStatus),
      notes:
        this.readNullableString(metadata, 'notes') ??
        document.title ??
        document.issuingAuthority ??
        null,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  private mapCanonicalStatusHistoryToDriverHistory(
    history: WorkforceStatusHistoryResponse,
  ): DriverStatusHistoryResponse {
    return {
      id: history.id,
      driverId: history.workforceMemberId,
      statusCategory: this.mapWorkforceStatusCategoryToDriver(history.category),
      previousValue: history.previousValue,
      newValue: history.nextValue,
      changedByUserId: history.changedByUserId,
      reason: history.reason,
      createdAt: history.effectiveAt,
    };
  }

  private hasCanonicalParity(legacyIds: string[], canonicalIds: string[]) {
    if (legacyIds.length === 0) {
      return canonicalIds.length > 0;
    }

    const canonicalIdSet = new Set(canonicalIds);
    return legacyIds.every((id) => canonicalIdSet.has(id));
  }

  private buildParityScope(
    scope: string,
    legacyIds: string[],
    canonicalIds: string[],
    notes: string[],
  ) {
    const canonicalIdSet = new Set(canonicalIds);
    return {
      scope,
      legacyCount: legacyIds.length,
      canonicalCount: canonicalIds.length,
      missingCanonicalIds: legacyIds.filter((id) => !canonicalIdSet.has(id)).slice(0, 25),
      notes,
    };
  }

  private readCompatibilityMetadata(metadata: unknown) {
    return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : null;
  }

  private readNullableString(
    metadata: Record<string, unknown> | null,
    key: string,
  ): string | null {
    if (!metadata) {
      return null;
    }

    const value = metadata[key];
    return typeof value === 'string' ? value : null;
  }

  private readDate(metadata: Record<string, unknown> | null, key: string): Date | null {
    const value = this.readNullableString(metadata, key);
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private readDriverOnboardingStatus(
    metadata: Record<string, unknown> | null,
  ): DriverOnboardingStatus | null {
    const value = this.readNullableString(metadata, 'onboardingStatus');
    if (!value || !Object.values(DriverOnboardingStatus).includes(value as DriverOnboardingStatus)) {
      return null;
    }

    return value as DriverOnboardingStatus;
  }

  private mapWorkforceOperationalStatusToDriver(value: string): DriverOperationalStatus {
    if (value === 'ACTIVE') return DriverOperationalStatus.ACTIVE;
    if (value === 'SUSPENDED') return DriverOperationalStatus.SUSPENDED;
    if (value === 'BLOCKED') return DriverOperationalStatus.BLOCKED;
    if (value === 'OFF_DUTY') return DriverOperationalStatus.OFF_DUTY;
    return DriverOperationalStatus.INACTIVE;
  }

  private mapWorkforceComplianceStatusToDriver(value: string): DriverComplianceStatus {
    if (value === 'COMPLIANT') return DriverComplianceStatus.COMPLIANT;
    if (value === 'NON_COMPLIANT') return DriverComplianceStatus.NON_COMPLIANT;
    if (value === 'EXPIRED') return DriverComplianceStatus.EXPIRED;
    if (value === 'UNDER_REVIEW') return DriverComplianceStatus.UNDER_REVIEW;
    return DriverComplianceStatus.PENDING;
  }

  private mapWorkforceAvailabilityStatusToDriver(value: string): DriverAssignmentStatus {
    if (value === 'AVAILABLE') return DriverAssignmentStatus.AVAILABLE;
    if (value === 'ASSIGNED') return DriverAssignmentStatus.ASSIGNED;
    if (value === 'RESTRICTED') return DriverAssignmentStatus.RESTRICTED;
    return DriverAssignmentStatus.UNAVAILABLE;
  }

  private mapDriverOperationalStatusToWorkforce(
    value: DriverOperationalStatus,
  ): UpdateWorkforceMemberDto['operationalStatus'] {
    if (value === DriverOperationalStatus.ACTIVE) return 'ACTIVE';
    if (value === DriverOperationalStatus.SUSPENDED) return 'SUSPENDED';
    if (value === DriverOperationalStatus.BLOCKED) return 'BLOCKED';
    if (value === DriverOperationalStatus.OFF_DUTY) return 'OFF_DUTY';
    return 'INACTIVE';
  }

  private mapDriverOperationalStatusToCreateWorkforce(
    value: DriverOperationalStatus,
  ): WorkforceOperationalStatus {
    return this.mapDriverOperationalStatusToWorkforce(value) as WorkforceOperationalStatus;
  }

  private mapDriverComplianceStatusToWorkforce(
    value: DriverComplianceStatus,
  ): UpdateWorkforceMemberDto['complianceStatus'] {
    if (value === DriverComplianceStatus.COMPLIANT) return 'COMPLIANT';
    if (value === DriverComplianceStatus.NON_COMPLIANT) return 'NON_COMPLIANT';
    if (value === DriverComplianceStatus.EXPIRED) return 'EXPIRED';
    if (value === DriverComplianceStatus.UNDER_REVIEW) return 'UNDER_REVIEW';
    return 'PENDING';
  }

  private mapDriverComplianceStatusToCreateWorkforce(
    value: DriverComplianceStatus,
  ): WorkforceComplianceStatus {
    return this.mapDriverComplianceStatusToWorkforce(value) as WorkforceComplianceStatus;
  }

  private mapDriverAssignmentStatusToWorkforce(
    value: DriverAssignmentStatus,
  ): UpdateWorkforceMemberDto['availabilityStatus'] {
    if (value === DriverAssignmentStatus.AVAILABLE) return 'AVAILABLE';
    if (value === DriverAssignmentStatus.ASSIGNED) return 'ASSIGNED';
    if (value === DriverAssignmentStatus.RESTRICTED) return 'RESTRICTED';
    return 'UNAVAILABLE';
  }

  private mapDriverAssignmentStatusToCreateWorkforce(
    value: DriverAssignmentStatus,
  ): WorkforceAvailabilityStatus {
    return this.mapDriverAssignmentStatusToWorkforce(value) as WorkforceAvailabilityStatus;
  }

  private resolveWorkforceMemberType(dto: CreateDriverDto): WorkforceMemberType {
    return dto.employeeId ? WorkforceMemberType.EMPLOYEE : WorkforceMemberType.CONTRACTOR;
  }

  private resolveWorkforceEmploymentModel(
    dto: CreateDriverDto,
  ): WorkforceEmploymentModel {
    return dto.employeeId ? WorkforceEmploymentModel.FULL_TIME : WorkforceEmploymentModel.CONTRACT;
  }

  private mapDriverStatusCategoryToWorkforce(
    value: DriverStatusCategory,
  ): UpdateWorkforceStatusDto['category'] {
    if (value === DriverStatusCategory.COMPLIANCE_STATUS) return 'COMPLIANCE_STATUS';
    if (value === DriverStatusCategory.ASSIGNMENT_STATUS) return 'AVAILABILITY_STATUS';
    return 'OPERATIONAL_STATUS';
  }

  private mapCredentialDocumentTypeToLegacy(value: CredentialDocumentType): DriverDocumentType {
    if (value === CredentialDocumentType.BACKGROUND_CHECK) return DriverDocumentType.BACKGROUND_CHECK;
    if (value === CredentialDocumentType.MEDICAL_CLEARANCE) return DriverDocumentType.MEDICAL_CERTIFICATE;
    if (value === CredentialDocumentType.INSURANCE) return DriverDocumentType.INSURANCE_PROOF;
    if (value === CredentialDocumentType.IDENTITY_DOCUMENT) return DriverDocumentType.NATIONAL_ID;
    if (value === CredentialDocumentType.PERMIT) return DriverDocumentType.VEHICLE_PERMIT;
    if (value === CredentialDocumentType.LICENSE) return DriverDocumentType.DRIVER_LICENSE;
    return DriverDocumentType.OTHER;
  }

  private mapCredentialVerificationStatusToLegacy(
    value: CredentialVerificationStatus,
  ): DocumentVerificationStatus {
    if (value === CredentialVerificationStatus.VERIFIED) return DocumentVerificationStatus.VERIFIED;
    if (value === CredentialVerificationStatus.REJECTED) return DocumentVerificationStatus.REJECTED;
    if (value === CredentialVerificationStatus.EXPIRED) return DocumentVerificationStatus.EXPIRED;
    return DocumentVerificationStatus.PENDING;
  }

  private mapLegacyDriverDocumentTypeToCredential(
    value: DriverDocumentType,
  ): CreateCredentialDocumentDto['documentType'] {
    if (value === DriverDocumentType.BACKGROUND_CHECK) return CredentialDocumentType.BACKGROUND_CHECK;
    if (value === DriverDocumentType.MEDICAL_CERTIFICATE) return CredentialDocumentType.MEDICAL_CLEARANCE;
    if (value === DriverDocumentType.INSURANCE_PROOF) return CredentialDocumentType.INSURANCE;
    if (value === DriverDocumentType.NATIONAL_ID) return CredentialDocumentType.IDENTITY_DOCUMENT;
    if (value === DriverDocumentType.VEHICLE_PERMIT) return CredentialDocumentType.PERMIT;
    if (value === DriverDocumentType.DRIVER_LICENSE) return CredentialDocumentType.LICENSE;
    return CredentialDocumentType.OTHER;
  }

  private mapLegacyVerificationStatusToCredential(
    value: DocumentVerificationStatus,
  ): CreateCredentialDocumentDto['verificationStatus'] {
    if (value === DocumentVerificationStatus.VERIFIED) return CredentialVerificationStatus.VERIFIED;
    if (value === DocumentVerificationStatus.REJECTED) return CredentialVerificationStatus.REJECTED;
    if (value === DocumentVerificationStatus.EXPIRED) return CredentialVerificationStatus.EXPIRED;
    return CredentialVerificationStatus.PENDING;
  }

  private mapWorkforceStatusCategoryToDriver(value: string): DriverStatusCategory {
    if (value === 'COMPLIANCE_STATUS') return DriverStatusCategory.COMPLIANCE_STATUS;
    if (value === 'AVAILABILITY_STATUS') return DriverStatusCategory.ASSIGNMENT_STATUS;
    return DriverStatusCategory.OPERATIONAL_STATUS;
  }

  private evaluateEligibility(
    driver: Omit<DriverResponse, 'isEligibleForAssignment'>,
  ) {
    const onboardingReady =
      driver.onboardingStatus === DriverOnboardingStatus.APPROVED ||
      driver.onboardingStatus === DriverOnboardingStatus.COMPLETED;

    return (
      onboardingReady &&
      driver.operationalStatus === DriverOperationalStatus.ACTIVE &&
      driver.complianceStatus === DriverComplianceStatus.COMPLIANT &&
      driver.assignmentStatus === DriverAssignmentStatus.AVAILABLE
    );
  }

  private ensureValidStatusTransition(
    category: DriverStatusCategory,
    newValue: string,
  ) {
    const allowedValues: Record<DriverStatusCategory, string[]> = {
      [DriverStatusCategory.ONBOARDING_STATUS]: Object.values(DriverOnboardingStatus),
      [DriverStatusCategory.OPERATIONAL_STATUS]: Object.values(DriverOperationalStatus),
      [DriverStatusCategory.COMPLIANCE_STATUS]: Object.values(DriverComplianceStatus),
      [DriverStatusCategory.ASSIGNMENT_STATUS]: Object.values(DriverAssignmentStatus),
    };

    if (!allowedValues[category].includes(newValue)) {
      throw new BadRequestException('Invalid operator status value for the provided category.');
    }
  }

  private getDriverStatusValue(
    driver: Omit<DriverResponse, 'isEligibleForAssignment'>,
    category: DriverStatusCategory,
  ) {
    switch (category) {
      case DriverStatusCategory.ONBOARDING_STATUS:
        return driver.onboardingStatus;
      case DriverStatusCategory.OPERATIONAL_STATUS:
        return driver.operationalStatus;
      case DriverStatusCategory.COMPLIANCE_STATUS:
        return driver.complianceStatus;
      case DriverStatusCategory.ASSIGNMENT_STATUS:
        return driver.assignmentStatus;
    }
  }

  private buildDriverStatusUpdate(category: DriverStatusCategory, newValue: string) {
    switch (category) {
      case DriverStatusCategory.ONBOARDING_STATUS:
        return {
          onboardingStatus: newValue as DriverOnboardingStatus,
        } satisfies Prisma.DriverUpdateInput;
      case DriverStatusCategory.OPERATIONAL_STATUS:
        return {
          operationalStatus: newValue as DriverOperationalStatus,
          ...(newValue === DriverOperationalStatus.SUSPENDED
            ? { suspendedAt: new Date() }
            : {}),
          ...(newValue === DriverOperationalStatus.INACTIVE ||
          newValue === DriverOperationalStatus.BLOCKED
            ? { deactivatedAt: new Date() }
            : {}),
        } satisfies Prisma.DriverUpdateInput;
      case DriverStatusCategory.COMPLIANCE_STATUS:
        return {
          complianceStatus: newValue as DriverComplianceStatus,
        } satisfies Prisma.DriverUpdateInput;
      case DriverStatusCategory.ASSIGNMENT_STATUS:
        return {
          assignmentStatus: newValue as DriverAssignmentStatus,
        } satisfies Prisma.DriverUpdateInput;
    }
  }

  private async recalculateComplianceStatus(
    transaction: Prisma.TransactionClient,
    driverId: string,
  ) {
    const driver = await transaction.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        licenseExpiresAt: true,
        complianceStatus: true,
      },
    });

    if (!driver) {
      return;
    }

    const documents = await transaction.driverDocument.findMany({
      where: { driverId },
      select: {
        verificationStatus: true,
        expiresAt: true,
      },
    });

    const now = new Date();
    const hasExpiredLicense = driver.licenseExpiresAt !== null && driver.licenseExpiresAt < now;
    const hasExpiredDocument = documents.some(
      (document) => document.expiresAt !== null && document.expiresAt < now,
    );
    const hasRejectedDocument = documents.some(
      (document) => document.verificationStatus === DocumentVerificationStatus.REJECTED,
    );
    const hasPendingDocument = documents.some(
      (document) => document.verificationStatus === DocumentVerificationStatus.PENDING,
    );

    let complianceStatus: DriverComplianceStatus = DriverComplianceStatus.COMPLIANT;

    if (hasExpiredLicense || hasExpiredDocument) {
      complianceStatus = DriverComplianceStatus.EXPIRED;
    } else if (hasRejectedDocument) {
      complianceStatus = DriverComplianceStatus.NON_COMPLIANT;
    } else if (hasPendingDocument || documents.length === 0) {
      complianceStatus = DriverComplianceStatus.UNDER_REVIEW;
    }

    if (complianceStatus !== driver.complianceStatus) {
      await transaction.driver.update({
        where: { id: driverId },
        data: {
          complianceStatus,
        },
      });
    }
  }
}
