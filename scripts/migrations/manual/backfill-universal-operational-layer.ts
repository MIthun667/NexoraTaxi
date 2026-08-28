import {
  AssetAvailabilityStatus,
  AssetComplianceStatus,
  AssetMaintenanceStatus,
  AssetMaintenanceType,
  AssetOperationalStatus,
  AssetStatusCategory,
  AssetType,
  AssignmentType,
  CredentialDocumentType,
  CredentialVerificationStatus,
  IncidentSeverity,
  OperationalIncidentStatus,
  OperationalZoneType,
  Prisma,
  PrismaClient,
  ResourceAssignmentStatus,
  SchedulePlanStatus,
  SchedulePlanType,
  ScheduleShiftStatus,
  ShiftType,
  WorkforceAvailabilityStatus,
  WorkforceComplianceStatus,
  WorkforceEmploymentModel,
  WorkforceMemberType,
  WorkforceOperationalStatus,
  WorkforceStatusCategory,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@prisma/client';
import { populateWorkforceExtensionsFromCompatibility } from './workforce-extension-population';

const prisma = new PrismaClient();
const BACKFILL_VERSION = 'universal-operational-layer.v2';

type BackfillMode = 'apply' | 'verify';

type BackfillOptions = {
  mode: BackfillMode;
  organizationId?: string;
  json: boolean;
};

type ScopeReport = {
  scope: string;
  sourceCount: number;
  canonicalCount: number;
  missingTargetIds: string[];
  notes: string[];
};

type BackfillReport = {
  mode: BackfillMode;
  organizationId: string | null;
  mappingVersion: string;
  generatedAt: string;
  scopes: ScopeReport[];
};

function parseOptions(argv: string[]): BackfillOptions {
  const options: BackfillOptions = {
    mode: 'apply',
    json: argv.includes('--json'),
  };

  for (const arg of argv) {
    if (arg.startsWith('--mode=')) {
      const raw = arg.slice('--mode='.length);
      if (raw === 'apply' || raw === 'verify') {
        options.mode = raw;
      }
    }

    if (arg.startsWith('--organizationId=')) {
      options.organizationId = arg.slice('--organizationId='.length);
    }
  }

  return options;
}

function appendLineageMetadata(
  sourceModel: string,
  sourceId: string,
  extra?: Prisma.InputJsonObject,
): Prisma.InputJsonObject {
  return {
    ...(extra ?? {}),
    legacyLineage: {
      sourceModel,
      sourceId,
      mappingVersion: BACKFILL_VERSION,
    },
  };
}

function whereOrganization<T extends Record<string, unknown>>(
  options: BackfillOptions,
  where: T,
): T & { organizationId?: string } {
  if (!options.organizationId) {
    return where as T & { organizationId?: string };
  }

  return {
    ...where,
    organizationId: options.organizationId,
  };
}

function formatReport(report: BackfillReport, asJson: boolean): string {
  if (asJson) {
    return JSON.stringify(report, null, 2);
  }

  const lines = [
    `Backfill mode: ${report.mode}`,
    `Organization scope: ${report.organizationId ?? 'all'}`,
    `Mapping version: ${report.mappingVersion}`,
    `Generated at: ${report.generatedAt}`,
    '',
  ];

  for (const scope of report.scopes) {
    lines.push(
      `[${scope.scope}] source=${scope.sourceCount} canonical=${scope.canonicalCount} missing=${scope.missingTargetIds.length}`,
    );
    if (scope.notes.length > 0) {
      lines.push(`  notes: ${scope.notes.join(' | ')}`);
    }
    if (scope.missingTargetIds.length > 0) {
      lines.push(`  missing target ids: ${scope.missingTargetIds.join(', ')}`);
    }
  }

  return lines.join('\n');
}

function reportHasMismatches(report: BackfillReport): boolean {
  return report.scopes.some((scope) => scope.missingTargetIds.length > 0);
}

function mapDriverOperationalStatus(value: string): WorkforceOperationalStatus {
  if (value === 'ACTIVE') return WorkforceOperationalStatus.ACTIVE;
  if (value === 'SUSPENDED') return WorkforceOperationalStatus.SUSPENDED;
  if (value === 'BLOCKED') return WorkforceOperationalStatus.BLOCKED;
  if (value === 'OFF_DUTY') return WorkforceOperationalStatus.OFF_DUTY;
  return WorkforceOperationalStatus.INACTIVE;
}

function mapDriverComplianceStatus(value: string): WorkforceComplianceStatus {
  if (value === 'COMPLIANT') return WorkforceComplianceStatus.COMPLIANT;
  if (value === 'NON_COMPLIANT') return WorkforceComplianceStatus.NON_COMPLIANT;
  if (value === 'EXPIRED') return WorkforceComplianceStatus.EXPIRED;
  if (value === 'UNDER_REVIEW') return WorkforceComplianceStatus.UNDER_REVIEW;
  return WorkforceComplianceStatus.PENDING;
}

function mapDriverAssignmentStatus(value: string): WorkforceAvailabilityStatus {
  if (value === 'AVAILABLE') return WorkforceAvailabilityStatus.AVAILABLE;
  if (value === 'ASSIGNED') return WorkforceAvailabilityStatus.ASSIGNED;
  if (value === 'RESTRICTED') return WorkforceAvailabilityStatus.RESTRICTED;
  return WorkforceAvailabilityStatus.UNAVAILABLE;
}

function mapDriverDocumentType(value: string): CredentialDocumentType {
  if (value === 'BACKGROUND_CHECK') return CredentialDocumentType.BACKGROUND_CHECK;
  if (value === 'MEDICAL_CERTIFICATE') return CredentialDocumentType.MEDICAL_CLEARANCE;
  if (value === 'INSURANCE_PROOF') return CredentialDocumentType.INSURANCE;
  if (value === 'NATIONAL_ID') return CredentialDocumentType.IDENTITY_DOCUMENT;
  if (value === 'VEHICLE_PERMIT') return CredentialDocumentType.PERMIT;
  if (value === 'DRIVER_LICENSE') return CredentialDocumentType.LICENSE;
  return CredentialDocumentType.OTHER;
}

function mapDocumentVerificationStatus(value: string): CredentialVerificationStatus {
  if (value === 'VERIFIED') return CredentialVerificationStatus.VERIFIED;
  if (value === 'REJECTED') return CredentialVerificationStatus.REJECTED;
  if (value === 'EXPIRED') return CredentialVerificationStatus.EXPIRED;
  return CredentialVerificationStatus.PENDING;
}

function mapDriverStatusCategory(value: string): WorkforceStatusCategory {
  if (value === 'COMPLIANCE_STATUS') return WorkforceStatusCategory.COMPLIANCE_STATUS;
  if (value === 'ASSIGNMENT_STATUS') return WorkforceStatusCategory.AVAILABILITY_STATUS;
  return WorkforceStatusCategory.OPERATIONAL_STATUS;
}

function mapFleetOperationalStatus(value: string): AssetOperationalStatus {
  if (value === 'ACTIVE') return AssetOperationalStatus.ACTIVE;
  if (value === 'IN_SERVICE') return AssetOperationalStatus.IN_SERVICE;
  if (value === 'OUT_OF_SERVICE') return AssetOperationalStatus.OUT_OF_SERVICE;
  if (value === 'BLOCKED') return AssetOperationalStatus.BLOCKED;
  return AssetOperationalStatus.INACTIVE;
}

function mapFleetComplianceStatus(value: string): AssetComplianceStatus {
  if (value === 'COMPLIANT') return AssetComplianceStatus.COMPLIANT;
  if (value === 'NON_COMPLIANT') return AssetComplianceStatus.NON_COMPLIANT;
  if (value === 'EXPIRED') return AssetComplianceStatus.EXPIRED;
  if (value === 'UNDER_REVIEW') return AssetComplianceStatus.UNDER_REVIEW;
  return AssetComplianceStatus.PENDING;
}

function mapFleetAssignmentStatus(value: string): AssetAvailabilityStatus {
  if (value === 'AVAILABLE') return AssetAvailabilityStatus.AVAILABLE;
  if (value === 'ASSIGNED') return AssetAvailabilityStatus.ASSIGNED;
  if (value === 'RESERVED') return AssetAvailabilityStatus.RESERVED;
  if (value === 'RESTRICTED') return AssetAvailabilityStatus.RESTRICTED;
  return AssetAvailabilityStatus.UNAVAILABLE;
}

function mapFleetStatusCategory(value: string): AssetStatusCategory {
  if (value === 'COMPLIANCE_STATUS') return AssetStatusCategory.COMPLIANCE_STATUS;
  if (value === 'ASSIGNMENT_STATUS') return AssetStatusCategory.AVAILABILITY_STATUS;
  return AssetStatusCategory.OPERATIONAL_STATUS;
}

function mapMaintenanceType(value: string): AssetMaintenanceType {
  if (value === 'INSPECTION') return AssetMaintenanceType.INSPECTION;
  if (value === 'REPAIR') return AssetMaintenanceType.REPAIR;
  if (value === 'CLEANING') return AssetMaintenanceType.CLEANING;
  return AssetMaintenanceType.OTHER;
}

function mapMaintenanceStatus(value: string): AssetMaintenanceStatus {
  if (value === 'IN_PROGRESS') return AssetMaintenanceStatus.IN_PROGRESS;
  if (value === 'COMPLETED') return AssetMaintenanceStatus.COMPLETED;
  if (value === 'CANCELLED') return AssetMaintenanceStatus.CANCELLED;
  if (value === 'OVERDUE') return AssetMaintenanceStatus.OVERDUE;
  return AssetMaintenanceStatus.SCHEDULED;
}

function mapDispatchShiftStatus(value: string): ScheduleShiftStatus {
  if (value === 'ACTIVE') return ScheduleShiftStatus.ACTIVE;
  if (value === 'COMPLETED') return ScheduleShiftStatus.COMPLETED;
  if (value === 'CANCELLED') return ScheduleShiftStatus.CANCELLED;
  return ScheduleShiftStatus.SCHEDULED;
}

function mapAssignmentStatus(value: string): ResourceAssignmentStatus {
  if (value === 'ACTIVE') return ResourceAssignmentStatus.ACTIVE;
  if (value === 'RELEASED') return ResourceAssignmentStatus.RELEASED;
  if (value === 'CANCELLED') return ResourceAssignmentStatus.CANCELLED;
  if (value === 'SUSPENDED') return ResourceAssignmentStatus.SUSPENDED;
  return ResourceAssignmentStatus.ASSIGNED;
}

function mapDispatchRunStatus(value: string): WorkOrderStatus {
  if (value === 'ACTIVE') return WorkOrderStatus.ACTIVE;
  if (value === 'COMPLETED') return WorkOrderStatus.COMPLETED;
  if (value === 'CANCELLED') return WorkOrderStatus.CANCELLED;
  if (value === 'FAILED') return WorkOrderStatus.FAILED;
  return WorkOrderStatus.READY;
}

function mapIncidentSeverity(value: string): IncidentSeverity {
  if (value === 'CRITICAL') return IncidentSeverity.CRITICAL;
  if (value === 'HIGH') return IncidentSeverity.HIGH;
  if (value === 'MEDIUM') return IncidentSeverity.MEDIUM;
  return IncidentSeverity.LOW;
}

function mapIncidentStatus(value: string): OperationalIncidentStatus {
  if (value === 'IN_PROGRESS') return OperationalIncidentStatus.IN_PROGRESS;
  if (value === 'RESOLVED') return OperationalIncidentStatus.RESOLVED;
  if (value === 'CANCELLED') return OperationalIncidentStatus.CANCELLED;
  return OperationalIncidentStatus.OPEN;
}

async function collectParityReport(
  scope: string,
  sourceIds: string[],
  canonicalIds: string[],
  notes: string[] = [],
): Promise<ScopeReport> {
  const canonicalIdSet = new Set(canonicalIds);
  const missingTargetIds = sourceIds.filter((id) => !canonicalIdSet.has(id));

  return {
    scope,
    sourceCount: sourceIds.length,
    canonicalCount: canonicalIds.length,
    missingTargetIds,
    notes,
  };
}

async function ensureDefaultSchedulePlans(options: BackfillOptions) {
  const organizations = await prisma.organization.findMany({
    where: options.organizationId ? { id: options.organizationId } : undefined,
    select: { id: true },
  });

  for (const organization of organizations) {
    const hasPlan = await prisma.schedulePlan.findFirst({
      where: { organizationId: organization.id },
      select: { id: true },
    });
    if (!hasPlan) {
      const now = new Date();
      const windowEnd = new Date(now);
      windowEnd.setDate(windowEnd.getDate() + 30);
      await prisma.schedulePlan.create({
        data: {
          organizationId: organization.id,
          name: 'Migrated default schedule plan',
          planType: SchedulePlanType.ROLLING,
          status: SchedulePlanStatus.ACTIVE,
          planningWindowStart: now,
          planningWindowEnd: windowEnd,
          metadata: appendLineageMetadata('DispatchShift', organization.id, {
            source: 'migration-bootstrap',
          }),
        },
      });
    }
  }
}

async function backfillZones(options: BackfillOptions): Promise<ScopeReport> {
  const zones = await prisma.dispatchZone.findMany({
    where: whereOrganization(options, {}),
    select: {
      id: true,
      organizationId: true,
      code: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (options.mode === 'apply') {
    for (const zone of zones) {
      await prisma.operationalZone.upsert({
        where: { id: zone.id },
        create: {
          id: zone.id,
          organizationId: zone.organizationId,
          zoneCode: zone.code,
          name: zone.name,
          zoneType: OperationalZoneType.SERVICE_AREA,
          description: zone.description,
          isActive: zone.isActive,
          metadata: appendLineageMetadata('DispatchZone', zone.id),
          createdAt: zone.createdAt,
          updatedAt: zone.updatedAt,
        },
        update: {
          organizationId: zone.organizationId,
          zoneCode: zone.code,
          name: zone.name,
          description: zone.description,
          isActive: zone.isActive,
          metadata: appendLineageMetadata('DispatchZone', zone.id),
        },
      });
    }
  }

  const canonicalZones = await prisma.operationalZone.findMany({
    where: whereOrganization(options, {}),
    select: { id: true },
  });

  return collectParityReport(
    'dispatch-zones->operational-zones',
    zones.map((zone) => zone.id),
    canonicalZones.map((zone) => zone.id),
    ['Zone codes are mapped deterministically by shared primary key.'],
  );
}

async function backfillWorkforce(options: BackfillOptions): Promise<ScopeReport[]> {
  const drivers = await prisma.driver.findMany({
    where: whereOrganization(options, { deletedAt: null }),
    select: {
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
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  });

  const driverOrganizationById = new Map(drivers.map((driver) => [driver.id, driver.organizationId]));

  if (options.mode === 'apply') {
    for (const driver of drivers) {
      await prisma.workforceMember.upsert({
        where: { id: driver.id },
        create: {
          id: driver.id,
          organizationId: driver.organizationId,
          employeeId: driver.employeeId,
          userId: driver.userId,
          workerCode: driver.driverCode,
          workerType: WorkforceMemberType.EMPLOYEE,
          employmentModel: WorkforceEmploymentModel.FULL_TIME,
          firstName: driver.firstName,
          lastName: driver.lastName,
          displayName: `${driver.firstName} ${driver.lastName}`,
          workEmail: driver.workEmail,
          phoneNumber: driver.phoneNumber,
          operationalStatus: mapDriverOperationalStatus(driver.operationalStatus),
          complianceStatus: mapDriverComplianceStatus(driver.complianceStatus),
          availabilityStatus: mapDriverAssignmentStatus(driver.assignmentStatus),
          metadata: appendLineageMetadata('Driver', driver.id, {
            onboardingStatus: driver.onboardingStatus,
            licenseNumber: driver.licenseNumber,
            licenseIssuedAt: driver.licenseIssuedAt?.toISOString() ?? null,
            licenseExpiresAt: driver.licenseExpiresAt?.toISOString() ?? null,
            joinedAt: driver.joinedAt.toISOString(),
          }),
          createdAt: driver.createdAt,
          updatedAt: driver.updatedAt,
        },
        update: {
          organizationId: driver.organizationId,
          employeeId: driver.employeeId,
          userId: driver.userId,
          workerCode: driver.driverCode,
          firstName: driver.firstName,
          lastName: driver.lastName,
          displayName: `${driver.firstName} ${driver.lastName}`,
          workEmail: driver.workEmail,
          phoneNumber: driver.phoneNumber,
          operationalStatus: mapDriverOperationalStatus(driver.operationalStatus),
          complianceStatus: mapDriverComplianceStatus(driver.complianceStatus),
          availabilityStatus: mapDriverAssignmentStatus(driver.assignmentStatus),
          deletedAt: driver.deletedAt,
          metadata: appendLineageMetadata('Driver', driver.id, {
            onboardingStatus: driver.onboardingStatus,
            licenseNumber: driver.licenseNumber,
            licenseIssuedAt: driver.licenseIssuedAt?.toISOString() ?? null,
            licenseExpiresAt: driver.licenseExpiresAt?.toISOString() ?? null,
            joinedAt: driver.joinedAt.toISOString(),
          }),
        },
      });
    }
  }

  const canonicalMembers = await prisma.workforceMember.findMany({
    where: whereOrganization(options, { deletedAt: null }),
    select: { id: true },
  });

  const documents = await prisma.driverDocument.findMany({
    where: options.organizationId
      ? { driver: { organizationId: options.organizationId } }
      : undefined,
    select: {
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
    },
  });

  if (options.mode === 'apply') {
    for (const document of documents) {
      const organizationId = driverOrganizationById.get(document.driverId);
      if (!organizationId) {
        continue;
      }

      await prisma.credentialDocument.upsert({
        where: { id: document.id },
        create: {
          id: document.id,
          organizationId,
          workforceMemberId: document.driverId,
          documentType: mapDriverDocumentType(document.documentType),
          title: document.documentType.replaceAll('_', ' '),
          documentNumber: document.documentNumber,
          issuedAt: document.issuedAt,
          expiresAt: document.expiresAt,
          verificationStatus: mapDocumentVerificationStatus(document.verificationStatus),
          metadata: appendLineageMetadata('DriverDocument', document.id, document.notes
            ? ({ notes: document.notes } as Prisma.InputJsonObject)
            : undefined),
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
        update: {
          organizationId,
          workforceMemberId: document.driverId,
          documentType: mapDriverDocumentType(document.documentType),
          title: document.documentType.replaceAll('_', ' '),
          documentNumber: document.documentNumber,
          issuedAt: document.issuedAt,
          expiresAt: document.expiresAt,
          verificationStatus: mapDocumentVerificationStatus(document.verificationStatus),
          metadata: appendLineageMetadata('DriverDocument', document.id, document.notes
            ? ({ notes: document.notes } as Prisma.InputJsonObject)
            : undefined),
        },
      });
    }
  }

  const canonicalDocuments = await prisma.credentialDocument.findMany({
    where: options.organizationId
      ? { organizationId: options.organizationId }
      : undefined,
    select: { id: true },
  });

  const statuses = await prisma.driverStatusHistory.findMany({
    where: options.organizationId
      ? { driver: { organizationId: options.organizationId } }
      : undefined,
    select: {
      id: true,
      driverId: true,
      statusCategory: true,
      previousValue: true,
      newValue: true,
      reason: true,
      changedByUserId: true,
      createdAt: true,
    },
  });

  if (options.mode === 'apply') {
    for (const status of statuses) {
      const organizationId = driverOrganizationById.get(status.driverId);
      if (!organizationId) {
        continue;
      }

      await prisma.workforceStatusHistory.upsert({
        where: { id: status.id },
        create: {
          id: status.id,
          organizationId,
          workforceMemberId: status.driverId,
          category: mapDriverStatusCategory(status.statusCategory),
          previousValue: status.previousValue,
          nextValue: status.newValue,
          reason: status.reason,
          changedByUserId: status.changedByUserId,
          effectiveAt: status.createdAt,
          metadata: appendLineageMetadata('DriverStatusHistory', status.id),
          createdAt: status.createdAt,
          updatedAt: status.createdAt,
        },
        update: {
          organizationId,
          workforceMemberId: status.driverId,
          category: mapDriverStatusCategory(status.statusCategory),
          previousValue: status.previousValue,
          nextValue: status.newValue,
          reason: status.reason,
          changedByUserId: status.changedByUserId,
          effectiveAt: status.createdAt,
          metadata: appendLineageMetadata('DriverStatusHistory', status.id),
        },
      });
    }
  }

  const canonicalStatuses = await prisma.workforceStatusHistory.findMany({
    where: options.organizationId
      ? { organizationId: options.organizationId }
      : undefined,
    select: { id: true },
  });

  const extensionPopulation = await populateWorkforceExtensionsFromCompatibility(prisma, {
    organizationId: options.organizationId,
    mode: options.mode,
  });

  return [
    await collectParityReport(
      'drivers->workforce-members',
      drivers.map((driver) => driver.id),
      canonicalMembers.map((member) => member.id),
      ['Driver identity is preserved by shared primary key and canonical workerCode.'],
    ),
    await collectParityReport(
      'driver-documents->credential-documents',
      documents.map((document) => document.id),
      canonicalDocuments.map((document) => document.id),
      ['Driver organization ownership is inferred from the canonicalized workforce member source.'],
    ),
    await collectParityReport(
      'driver-status-history->workforce-status-history',
      statuses.map((status) => status.id),
      canonicalStatuses.map((status) => status.id),
      ['Status history preserves timestamps and actor references for audit continuity.'],
    ),
    await collectParityReport(
      'workforce-compatibility-metadata->profile-extensions',
      Array.from({ length: extensionPopulation.profileEligibleCount }, (_, index) => `eligible:${index}`),
      Array.from({ length: extensionPopulation.profilePopulatedCount }, (_, index) => `populated:${index}`),
      [
        `${extensionPopulation.profileMissingSourceCount} workforce members were skipped because joinedAt compatibility metadata was missing or invalid.`,
        'Profile extensions are populated from compatibility metadata without removing the original fallback fields.',
      ],
    ).then((report) => ({
      ...report,
      missingTargetIds: extensionPopulation.profileMissingTargetWorkforceIds,
    })),
    await collectParityReport(
      'workforce-compatibility-metadata->workforce-authorizations',
      Array.from({ length: extensionPopulation.authorizationEligibleCount }, (_, index) => `eligible:${index}`),
      Array.from({ length: extensionPopulation.authorizationPopulatedCount }, (_, index) => `populated:${index}`),
      [
        `${extensionPopulation.authorizationMissingSourceCount} workforce members were skipped because licenseNumber compatibility metadata was missing while date-only data was insufficient.`,
        `${extensionPopulation.authorizationDeferredCount} workforce members were deferred because multiple LICENSE authorizations already existed.`,
        `${extensionPopulation.evidenceLinkedCount} workforce members had a single LICENSE credential document suitable for evidence linkage.`,
      ],
    ).then((report) => ({
      ...report,
      missingTargetIds: extensionPopulation.authorizationMissingTargetWorkforceIds,
    })),
  ];
}

async function backfillAssets(options: BackfillOptions): Promise<ScopeReport[]> {
  const vehicles = await prisma.fleetVehicle.findMany({
    where: whereOrganization(options, { deletedAt: null }),
    select: {
      id: true,
      organizationId: true,
      vehicleCode: true,
      vin: true,
      make: true,
      model: true,
      modelYear: true,
      color: true,
      vehicleClass: true,
      registrationNumber: true,
      plateNumber: true,
      insurancePolicyNumber: true,
      insuranceExpiresAt: true,
      registrationExpiresAt: true,
      onboardingStatus: true,
      operationalStatus: true,
      complianceStatus: true,
      assignmentStatus: true,
      joinedAt: true,
      decommissionedAt: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  });

  const vehicleOrganizationById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.organizationId]));

  if (options.mode === 'apply') {
    for (const vehicle of vehicles) {
      await prisma.asset.upsert({
        where: { id: vehicle.id },
        create: {
          id: vehicle.id,
          organizationId: vehicle.organizationId,
          assetCode: vehicle.vehicleCode,
          assetType: AssetType.VEHICLE,
          assetClass: vehicle.vehicleClass,
          name: `${vehicle.make} ${vehicle.model}`,
          serialNumber: vehicle.vin,
          registrationNumber: vehicle.registrationNumber ?? vehicle.plateNumber,
          operationalStatus: mapFleetOperationalStatus(vehicle.operationalStatus),
          complianceStatus: mapFleetComplianceStatus(vehicle.complianceStatus),
          availabilityStatus: mapFleetAssignmentStatus(vehicle.assignmentStatus),
          specifications: {
            make: vehicle.make,
            model: vehicle.model,
            modelYear: vehicle.modelYear,
            color: vehicle.color,
            plateNumber: vehicle.plateNumber,
            insurancePolicyNumber: vehicle.insurancePolicyNumber,
            insuranceExpiresAt: vehicle.insuranceExpiresAt?.toISOString() ?? null,
            registrationExpiresAt: vehicle.registrationExpiresAt?.toISOString() ?? null,
          },
          metadata: appendLineageMetadata('FleetVehicle', vehicle.id, {
            onboardingStatus: vehicle.onboardingStatus,
            joinedAt: vehicle.joinedAt.toISOString(),
            decommissionedAt: vehicle.decommissionedAt?.toISOString() ?? null,
          }),
          createdAt: vehicle.createdAt,
          updatedAt: vehicle.updatedAt,
        },
        update: {
          organizationId: vehicle.organizationId,
          assetCode: vehicle.vehicleCode,
          assetType: AssetType.VEHICLE,
          assetClass: vehicle.vehicleClass,
          name: `${vehicle.make} ${vehicle.model}`,
          serialNumber: vehicle.vin,
          registrationNumber: vehicle.registrationNumber ?? vehicle.plateNumber,
          operationalStatus: mapFleetOperationalStatus(vehicle.operationalStatus),
          complianceStatus: mapFleetComplianceStatus(vehicle.complianceStatus),
          availabilityStatus: mapFleetAssignmentStatus(vehicle.assignmentStatus),
          deletedAt: vehicle.deletedAt,
          specifications: {
            make: vehicle.make,
            model: vehicle.model,
            modelYear: vehicle.modelYear,
            color: vehicle.color,
            plateNumber: vehicle.plateNumber,
            insurancePolicyNumber: vehicle.insurancePolicyNumber,
            insuranceExpiresAt: vehicle.insuranceExpiresAt?.toISOString() ?? null,
            registrationExpiresAt: vehicle.registrationExpiresAt?.toISOString() ?? null,
          },
          metadata: appendLineageMetadata('FleetVehicle', vehicle.id, {
            onboardingStatus: vehicle.onboardingStatus,
            joinedAt: vehicle.joinedAt.toISOString(),
            decommissionedAt: vehicle.decommissionedAt?.toISOString() ?? null,
          }),
        },
      });
    }
  }

  const canonicalAssets = await prisma.asset.findMany({
    where: whereOrganization(options, { deletedAt: null }),
    select: { id: true },
  });

  const maintenanceRecords = await prisma.fleetMaintenanceRecord.findMany({
    where: options.organizationId
      ? { vehicle: { organizationId: options.organizationId } }
      : undefined,
    select: {
      id: true,
      vehicleId: true,
      maintenanceType: true,
      title: true,
      description: true,
      scheduledAt: true,
      completedAt: true,
      status: true,
      vendorName: true,
      costAmount: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (options.mode === 'apply') {
    for (const record of maintenanceRecords) {
      const organizationId = vehicleOrganizationById.get(record.vehicleId);
      if (!organizationId) {
        continue;
      }

      await prisma.assetMaintenanceRecord.upsert({
        where: { id: record.id },
        create: {
          id: record.id,
          organizationId,
          assetId: record.vehicleId,
          maintenanceType: mapMaintenanceType(record.maintenanceType),
          title: record.title,
          description: record.description,
          status: mapMaintenanceStatus(record.status),
          priority: WorkOrderPriority.MEDIUM,
          scheduledAt: record.scheduledAt,
          completedAt: record.completedAt,
          vendorName: record.vendorName,
          costAmount: record.costAmount,
          currencyCode: 'USD',
          metadata: appendLineageMetadata('FleetMaintenanceRecord', record.id, record.notes
            ? ({ notes: record.notes } as Prisma.InputJsonObject)
            : undefined),
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
        update: {
          organizationId,
          assetId: record.vehicleId,
          maintenanceType: mapMaintenanceType(record.maintenanceType),
          title: record.title,
          description: record.description,
          status: mapMaintenanceStatus(record.status),
          scheduledAt: record.scheduledAt,
          completedAt: record.completedAt,
          vendorName: record.vendorName,
          costAmount: record.costAmount,
          currencyCode: 'USD',
          metadata: appendLineageMetadata('FleetMaintenanceRecord', record.id, record.notes
            ? ({ notes: record.notes } as Prisma.InputJsonObject)
            : undefined),
        },
      });
    }
  }

  const canonicalMaintenance = await prisma.assetMaintenanceRecord.findMany({
    where: options.organizationId
      ? { organizationId: options.organizationId }
      : undefined,
    select: { id: true },
  });

  const statuses = await prisma.fleetStatusHistory.findMany({
    where: options.organizationId
      ? { vehicle: { organizationId: options.organizationId } }
      : undefined,
    select: {
      id: true,
      vehicleId: true,
      statusCategory: true,
      previousValue: true,
      newValue: true,
      reason: true,
      changedByUserId: true,
      createdAt: true,
    },
  });

  if (options.mode === 'apply') {
    for (const status of statuses) {
      const organizationId = vehicleOrganizationById.get(status.vehicleId);
      if (!organizationId) {
        continue;
      }

      await prisma.assetStatusHistory.upsert({
        where: { id: status.id },
        create: {
          id: status.id,
          organizationId,
          assetId: status.vehicleId,
          category: mapFleetStatusCategory(status.statusCategory),
          previousValue: status.previousValue,
          nextValue: status.newValue,
          reason: status.reason,
          changedByUserId: status.changedByUserId,
          effectiveAt: status.createdAt,
          metadata: appendLineageMetadata('FleetStatusHistory', status.id),
          createdAt: status.createdAt,
          updatedAt: status.createdAt,
        },
        update: {
          organizationId,
          assetId: status.vehicleId,
          category: mapFleetStatusCategory(status.statusCategory),
          previousValue: status.previousValue,
          nextValue: status.newValue,
          reason: status.reason,
          changedByUserId: status.changedByUserId,
          effectiveAt: status.createdAt,
          metadata: appendLineageMetadata('FleetStatusHistory', status.id),
        },
      });
    }
  }

  const canonicalStatuses = await prisma.assetStatusHistory.findMany({
    where: options.organizationId
      ? { organizationId: options.organizationId }
      : undefined,
    select: { id: true },
  });

  return [
    await collectParityReport(
      'fleet-vehicles->assets',
      vehicles.map((vehicle) => vehicle.id),
      canonicalAssets.map((asset) => asset.id),
      ['Asset subtype remains VEHICLE until broader asset-class adoption expands.'],
    ),
    await collectParityReport(
      'fleet-maintenance->asset-maintenance',
      maintenanceRecords.map((record) => record.id),
      canonicalMaintenance.map((record) => record.id),
      ['Maintenance lineage is preserved through shared identifiers and metadata.'],
    ),
    await collectParityReport(
      'fleet-status-history->asset-status-history',
      statuses.map((status) => status.id),
      canonicalStatuses.map((status) => status.id),
      ['Status history preserves actor linkage for later audit parity checks.'],
    ),
  ];
}

async function backfillSchedulingAndOperations(options: BackfillOptions): Promise<ScopeReport[]> {
  const shifts = await prisma.dispatchShift.findMany({
    where: options.organizationId
      ? { organizationId: options.organizationId, deletedAt: null }
      : { deletedAt: null },
    select: {
      id: true,
      organizationId: true,
      code: true,
      title: true,
      description: true,
      zoneId: true,
      startsAt: true,
      endsAt: true,
      status: true,
      supervisorUserId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (options.mode === 'apply') {
    for (const shift of shifts) {
      await prisma.scheduleShift.upsert({
        where: { id: shift.id },
        create: {
          id: shift.id,
          organizationId: shift.organizationId,
          shiftCode: shift.code,
          shiftType: ShiftType.OPERATIONS,
          title: shift.title,
          status: mapDispatchShiftStatus(shift.status),
          zoneId: shift.zoneId,
          ownerUserId: shift.supervisorUserId,
          startsAt: shift.startsAt,
          endsAt: shift.endsAt,
          metadata: appendLineageMetadata('DispatchShift', shift.id, shift.description
            ? ({ description: shift.description } as Prisma.InputJsonObject)
            : undefined),
          createdAt: shift.createdAt,
          updatedAt: shift.updatedAt,
        },
        update: {
          organizationId: shift.organizationId,
          shiftCode: shift.code,
          shiftType: ShiftType.OPERATIONS,
          title: shift.title,
          status: mapDispatchShiftStatus(shift.status),
          zoneId: shift.zoneId,
          ownerUserId: shift.supervisorUserId,
          startsAt: shift.startsAt,
          endsAt: shift.endsAt,
          metadata: appendLineageMetadata('DispatchShift', shift.id, shift.description
            ? ({ description: shift.description } as Prisma.InputJsonObject)
            : undefined),
        },
      });
    }
  }

  const canonicalShifts = await prisma.scheduleShift.findMany({
    where: options.organizationId
      ? { organizationId: options.organizationId }
      : undefined,
    select: { id: true },
  });

  const runs = await prisma.dispatchRun.findMany({
    where: options.organizationId
      ? { organizationId: options.organizationId }
      : undefined,
    include: {
      assignment: {
        select: {
          id: true,
          zoneId: true,
        },
      },
    },
  });

  if (options.mode === 'apply') {
    for (const run of runs) {
      await prisma.workOrder.upsert({
        where: { id: run.id },
        create: {
          id: run.id,
          organizationId: run.organizationId,
          workOrderCode: run.runCode,
          title: `Legacy dispatch run ${run.runCode}`,
          description:
            'Transitional compatibility projection created from a dispatch run. Do not treat as a finalized canonical operational run model.',
          workType: 'DISPATCH_RUN_TRANSITIONAL',
          status: mapDispatchRunStatus(run.dispatchStatus),
          priority: WorkOrderPriority.MEDIUM,
          zoneId: run.zoneId ?? run.assignment.zoneId,
          requestedAt: run.createdAt,
          actualStartAt: run.startedAt,
          actualEndAt: run.completedAt ?? run.cancelledAt,
          sourceType: 'DispatchRun',
          sourceId: run.id,
          metadata: appendLineageMetadata('DispatchRun', run.id, {
            assignmentId: run.assignmentId,
            dispatchStatus: run.dispatchStatus,
            transitionalCanonicalization: {
              canonicalTarget: 'WorkOrder',
              semanticDecisionPending: true,
              pendingDecision: 'OperationalRun',
            },
            cancelledAt: run.cancelledAt?.toISOString() ?? null,
          }),
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
        },
        update: {
          organizationId: run.organizationId,
          workOrderCode: run.runCode,
          status: mapDispatchRunStatus(run.dispatchStatus),
          zoneId: run.zoneId ?? run.assignment.zoneId,
          requestedAt: run.createdAt,
          actualStartAt: run.startedAt,
          actualEndAt: run.completedAt ?? run.cancelledAt,
          sourceType: 'DispatchRun',
          sourceId: run.id,
          metadata: appendLineageMetadata('DispatchRun', run.id, {
            assignmentId: run.assignmentId,
            dispatchStatus: run.dispatchStatus,
            transitionalCanonicalization: {
              canonicalTarget: 'WorkOrder',
              semanticDecisionPending: true,
              pendingDecision: 'OperationalRun',
            },
            cancelledAt: run.cancelledAt?.toISOString() ?? null,
          }),
        },
      });
    }
  }

  const canonicalWorkOrders = await prisma.workOrder.findMany({
    where: options.organizationId
      ? { organizationId: options.organizationId, sourceType: 'DispatchRun' }
      : { sourceType: 'DispatchRun' },
    select: { id: true },
  });

  return [
    await collectParityReport(
      'dispatch-shifts->schedule-shifts',
      shifts.map((shift) => shift.id),
      canonicalShifts.map((shift) => shift.id),
      ['SchedulePlan linkage remains bootstrap-generated until scheduling ownership is cut over.'],
    ),
    await collectParityReport(
      'dispatch-runs->work-orders-transitional',
      runs.map((run) => run.id),
      canonicalWorkOrders.map((workOrder) => workOrder.id),
      [
        'DispatchRun remains transitional and should not be treated as a finalized canonical WorkOrder replacement.',
        'A first-class OperationalRun decision is still pending.',
      ],
    ),
  ];
}

async function backfillAssignmentsAndIncidents(options: BackfillOptions): Promise<ScopeReport[]> {
  const assignments = await prisma.driverVehicleAssignment.findMany({
    where: options.organizationId
      ? { organizationId: options.organizationId }
      : undefined,
    select: {
      id: true,
      organizationId: true,
      driverId: true,
      vehicleId: true,
      zoneId: true,
      shiftId: true,
      assignmentStatus: true,
      assignedAt: true,
      releasedAt: true,
      assignedByUserId: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (options.mode === 'apply') {
    for (const assignment of assignments) {
      await prisma.resourceAssignment.upsert({
        where: { id: assignment.id },
        create: {
          id: assignment.id,
          organizationId: assignment.organizationId,
          assignmentType: AssignmentType.COMPOSITE,
          status: mapAssignmentStatus(assignment.assignmentStatus),
          workforceMemberId: assignment.driverId,
          assetId: assignment.vehicleId,
          shiftId: assignment.shiftId,
          zoneId: assignment.zoneId,
          assignedByUserId: assignment.assignedByUserId,
          assignedAt: assignment.assignedAt,
          releasedAt: assignment.releasedAt,
          metadata: appendLineageMetadata('DriverVehicleAssignment', assignment.id, assignment.notes
            ? ({ notes: assignment.notes } as Prisma.InputJsonObject)
            : undefined),
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt,
        },
        update: {
          organizationId: assignment.organizationId,
          assignmentType: AssignmentType.COMPOSITE,
          status: mapAssignmentStatus(assignment.assignmentStatus),
          workforceMemberId: assignment.driverId,
          assetId: assignment.vehicleId,
          shiftId: assignment.shiftId,
          zoneId: assignment.zoneId,
          assignedByUserId: assignment.assignedByUserId,
          assignedAt: assignment.assignedAt,
          releasedAt: assignment.releasedAt,
          metadata: appendLineageMetadata('DriverVehicleAssignment', assignment.id, assignment.notes
            ? ({ notes: assignment.notes } as Prisma.InputJsonObject)
            : undefined),
        },
      });
    }
  }

  const canonicalAssignments = await prisma.resourceAssignment.findMany({
    where: options.organizationId
      ? { organizationId: options.organizationId }
      : undefined,
    select: { id: true },
  });

  const incidents = await prisma.dispatchIncident.findMany({
    where: options.organizationId
      ? { organizationId: options.organizationId }
      : undefined,
    include: {
      assignment: {
        select: {
          driverId: true,
          vehicleId: true,
          zoneId: true,
        },
      },
      run: {
        select: {
          zoneId: true,
        },
      },
    },
  });

  if (options.mode === 'apply') {
    for (const incident of incidents) {
      await prisma.operationalIncident.upsert({
        where: { id: incident.id },
        create: {
          id: incident.id,
          organizationId: incident.organizationId,
          incidentCode: incident.incidentCode,
          incidentType: incident.incidentType,
          title: incident.title,
          description: incident.description,
          severity: mapIncidentSeverity(incident.severity),
          status: mapIncidentStatus(incident.status),
          zoneId: incident.run?.zoneId ?? incident.assignment?.zoneId ?? null,
          workOrderId: incident.runId,
          workforceMemberId: incident.assignment?.driverId ?? null,
          assetId: incident.assignment?.vehicleId ?? null,
          relatedEntityType: incident.runId ? 'dispatch-run' : 'driver-vehicle-assignment',
          relatedEntityId: incident.runId ?? incident.assignmentId ?? null,
          reportedByUserId: incident.reportedByUserId,
          reportedAt: incident.reportedAt,
          resolvedAt: incident.resolvedAt,
          metadata: appendLineageMetadata('DispatchIncident', incident.id, {
            assignmentId: incident.assignmentId,
            runId: incident.runId,
          }),
          createdAt: incident.createdAt,
          updatedAt: incident.updatedAt,
        },
        update: {
          organizationId: incident.organizationId,
          incidentCode: incident.incidentCode,
          incidentType: incident.incidentType,
          title: incident.title,
          description: incident.description,
          severity: mapIncidentSeverity(incident.severity),
          status: mapIncidentStatus(incident.status),
          zoneId: incident.run?.zoneId ?? incident.assignment?.zoneId ?? null,
          workOrderId: incident.runId,
          workforceMemberId: incident.assignment?.driverId ?? null,
          assetId: incident.assignment?.vehicleId ?? null,
          relatedEntityType: incident.runId ? 'dispatch-run' : 'driver-vehicle-assignment',
          relatedEntityId: incident.runId ?? incident.assignmentId ?? null,
          reportedByUserId: incident.reportedByUserId,
          reportedAt: incident.reportedAt,
          resolvedAt: incident.resolvedAt,
          metadata: appendLineageMetadata('DispatchIncident', incident.id, {
            assignmentId: incident.assignmentId,
            runId: incident.runId,
          }),
        },
      });
    }
  }

  const canonicalIncidents = await prisma.operationalIncident.findMany({
    where: options.organizationId
      ? { organizationId: options.organizationId }
      : undefined,
    select: { id: true },
  });

  return [
    await collectParityReport(
      'driver-vehicle-assignments->resource-assignments',
      assignments.map((assignment) => assignment.id),
      canonicalAssignments.map((assignment) => assignment.id),
      ['Assignment lineage remains shared-key and composite until cutover splits work and asset allocation rules.'],
    ),
    await collectParityReport(
      'dispatch-incidents->operational-incidents',
      incidents.map((incident) => incident.id),
      canonicalIncidents.map((incident) => incident.id),
      ['Incident workOrder linkage remains transitional where source data came from dispatch runs.'],
    ),
  ];
}

async function generateReport(options: BackfillOptions): Promise<BackfillReport> {
  if (options.mode === 'apply') {
    await ensureDefaultSchedulePlans(options);
  }

  const scopes: ScopeReport[] = [];
  scopes.push(await backfillZones(options));
  scopes.push(...(await backfillWorkforce(options)));
  scopes.push(...(await backfillAssets(options)));
  scopes.push(...(await backfillSchedulingAndOperations(options)));
  scopes.push(...(await backfillAssignmentsAndIncidents(options)));

  return {
    mode: options.mode,
    organizationId: options.organizationId ?? null,
    mappingVersion: BACKFILL_VERSION,
    generatedAt: new Date().toISOString(),
    scopes,
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const report = await generateReport(options);
  process.stdout.write(`${formatReport(report, options.json)}\n`);

  if (options.mode === 'verify' && reportHasMismatches(report)) {
    process.exitCode = 1;
  }
}

void main()
  .catch(async (error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
