import {
  CredentialDocumentType,
  Prisma,
  WorkforceAvailabilityStatus,
  WorkforceStatusCategory,
} from '@prisma/client';

import { deterministicUuid, phoneNumberFromIndex } from '../seed/utils';
import { populateWorkforceExtensionsFromCompatibility } from '../../migrations/manual/workforce-extension-population';
import {
  CREDENTIAL_TARGET,
  DEMO_REFERENCE_DATE,
  WORKER_SKILL_POOL,
  WORKFORCE_TARGET,
  addDays,
  credentialStatuses,
  credentialTypes,
  cycleEnum,
  employmentModels,
  normalizedDate,
  pickStatusValue,
  seededPick,
  workforceAvailabilityStatuses,
  workforceComplianceStatuses,
  workforceOperationalStatuses,
  workforceTypes,
} from './helpers';
import type { CoreSeedContext, WorkforceSeedResult } from './types';

export const seedWorkforce = async (
  context: CoreSeedContext & { zoneIds: string[]; populateExtensions?: boolean },
): Promise<WorkforceSeedResult> => {
  const {
    prisma,
    organizationId,
    employees,
    users,
    departments,
    positions,
    zoneIds,
    now,
    populateExtensions = false,
  } = context;
  const activeEmployees = employees.slice(0, 56);
  const departmentIds = departments.map((department) => department.id);
  const positionIds = positions.map((position) => position.id);
  const verifierIds = users.slice(0, 12).map((user) => user.id);

  const workforceMembers = Array.from({ length: WORKFORCE_TARGET }, (_, index) => {
    const employee = activeEmployees[index] ?? null;
    const linkedUser = employee?.userId ? users.find((user) => user.id === employee.userId) : null;
    const firstName = employee?.firstName ?? seededPick(['Arman', 'Mina', 'Sajid', 'Farah', 'Nabil', 'Tania'], `wf-first:${index}`);
    const lastName = employee?.lastName ?? seededPick(['Ahmed', 'Karim', 'Sultana', 'Hasan', 'Rahman', 'Noor'], `wf-last:${index}`);
    const workerCode = `WF-${String(index + 1).padStart(4, '0')}`;
    const operationalStatus = workforceOperationalStatuses[index];
    const availabilityStatus = workforceAvailabilityStatuses[index];
    const complianceStatus = workforceComplianceStatuses[index];
    const zoneId = zoneIds[index % zoneIds.length] ?? null;
    const primaryDepartmentId = employee?.departmentId ?? departmentIds[index % departmentIds.length] ?? null;
    const primaryPositionId = employee?.positionId ?? positionIds[index % positionIds.length] ?? null;
    const joinedAt = employee?.hireDate ?? addDays(now, -(180 - index));
    const licenseIssuedAt = addDays(joinedAt, 21);
    const licenseExpiresAt =
      index % 11 === 0
        ? addDays(DEMO_REFERENCE_DATE, -(12 + (index % 7)))
        : addDays(DEMO_REFERENCE_DATE, 180 + (index % 120));
    const licenseNumber = `WF-LIC-${String(index + 1).padStart(5, '0')}`;

    return {
      id: deterministicUuid(`workforce-member:${workerCode}`),
      organizationId,
      employeeId: employee?.id ?? null,
      userId: linkedUser?.id ?? null,
      workerCode,
      workerType: workforceTypes[index % workforceTypes.length],
      employmentModel: employmentModels[index % employmentModels.length],
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      workEmail: employee?.workEmail ?? `${firstName}.${lastName}.${index + 1}@nexoralogistics.demo`.toLowerCase(),
      phoneNumber: employee?.phoneNumber ?? phoneNumberFromIndex(index + 200),
      operationalStatus,
      complianceStatus,
      availabilityStatus,
      primaryDepartmentId,
      primaryPositionId,
      homeZoneId: zoneId,
      skills: WORKER_SKILL_POOL.filter((_, skillIndex) => (index + skillIndex) % 3 === 0),
      metadata: {
        seeded: true,
        shiftPreference: index % 3 === 0 ? 'DAY' : index % 3 === 1 ? 'SWING' : 'NIGHT',
        productivityBand: ['steady', 'high', 'developing'][index % 3],
        compatibilitySource: 'workforce-seed',
        writeOwner: 'workforce',
        joinedAt: joinedAt.toISOString(),
        licenseNumber,
        licenseIssuedAt: licenseIssuedAt.toISOString(),
        licenseExpiresAt: licenseExpiresAt.toISOString(),
      } as Prisma.InputJsonValue,
      createdAt: addDays(now, -(240 - index)),
      updatedAt: addDays(now, -(index % 21)),
      deletedAt: null,
    };
  });

  await prisma.workforceMember.createMany({ data: workforceMembers });

  const credentialDocuments = workforceMembers.slice(0, CREDENTIAL_TARGET).map((member, index) => {
    const issuedAt = addDays(DEMO_REFERENCE_DATE, -(420 - index * 2));
    const expiresAt = addDays(issuedAt, 365 + (index % 90));
    const verificationStatus = credentialStatuses[index % credentialStatuses.length];
    const compatibilityMetadata =
      (member.metadata && typeof member.metadata === 'object' && !Array.isArray(member.metadata)
        ? (member.metadata as Record<string, unknown>)
        : null) ?? null;
    const seededLicenseNumber =
      typeof compatibilityMetadata?.licenseNumber === 'string'
        ? compatibilityMetadata.licenseNumber
        : `WF-LIC-${String(index + 1).padStart(5, '0')}`;
    const documentType =
      index % 3 === 0
        ? CredentialDocumentType.LICENSE
        : credentialTypes[index % credentialTypes.length];

    return {
      id: deterministicUuid(`credential-document:${member.id}`),
      organizationId,
      workforceMemberId: member.id,
      documentType,
      title: `${member.displayName} ${documentType.replace(/_/g, ' ')}`,
      documentNumber:
        documentType === CredentialDocumentType.LICENSE
          ? seededLicenseNumber
          : `CD-${String(index + 1).padStart(5, '0')}`,
      issuingAuthority: ['National Logistics Authority', 'Safety Board', 'Internal Training Office'][index % 3],
      issuedAt,
      expiresAt,
      verificationStatus,
      verifiedByUserId: verificationStatus === 'PENDING' ? null : verifierIds[index % verifierIds.length] ?? null,
      verifiedAt: verificationStatus === 'PENDING' ? null : addDays(issuedAt, 5 + (index % 10)),
      storageUrl: `https://demo.local/credentials/${member.workerCode.toLowerCase()}`,
      metadata: { seeded: true } as Prisma.InputJsonValue,
      createdAt: issuedAt,
      updatedAt: addDays(issuedAt, 7),
    };
  });

  await prisma.credentialDocument.createMany({ data: credentialDocuments });

  const statusHistory = workforceMembers.flatMap((member, index) => {
    const effectiveBase = normalizedDate(addDays(DEMO_REFERENCE_DATE, -(40 - (index % 14))));
    return [
      {
        id: deterministicUuid(`workforce-status:${member.id}:operational`),
        organizationId,
        workforceMemberId: member.id,
        category: WorkforceStatusCategory.OPERATIONAL_STATUS,
        previousValue: 'PENDING',
        nextValue: member.operationalStatus,
        reason: 'Seeded operational readiness state',
        changedByUserId: verifierIds[index % verifierIds.length] ?? null,
        effectiveAt: effectiveBase,
        metadata: { seeded: true } as Prisma.InputJsonValue,
        createdAt: effectiveBase,
        updatedAt: effectiveBase,
      },
      {
        id: deterministicUuid(`workforce-status:${member.id}:availability`),
        organizationId,
        workforceMemberId: member.id,
        category: WorkforceStatusCategory.AVAILABILITY_STATUS,
        previousValue:
          index % 5 === 0 ? WorkforceAvailabilityStatus.AVAILABLE : WorkforceAvailabilityStatus.RESERVED,
        nextValue: member.availabilityStatus,
        reason: 'Seeded staffing allocation snapshot',
        changedByUserId: verifierIds[(index + 1) % verifierIds.length] ?? null,
        effectiveAt: addDays(effectiveBase, 1),
        metadata: { seeded: true } as Prisma.InputJsonValue,
        createdAt: addDays(effectiveBase, 1),
        updatedAt: addDays(effectiveBase, 1),
      },
    ];
  });

  await prisma.workforceStatusHistory.createMany({ data: statusHistory });

  const extensionPopulation = populateExtensions
    ? await populateWorkforceExtensionsFromCompatibility(prisma, {
        organizationId,
        mode: 'apply',
        now,
      })
    : {
        profileEligibleCount: 0,
        profileMissingSourceCount: 0,
        authorizationEligibleCount: 0,
        authorizationMissingSourceCount: 0,
        authorizationDeferredCount: 0,
        evidenceLinkedCount: 0,
        profilePopulatedCount: 0,
        authorizationPopulatedCount: 0,
        profileMissingTargetWorkforceIds: [],
        authorizationMissingTargetWorkforceIds: [],
        authorizationDeferredWorkforceIds: [],
      };

  return {
    workforceMembers,
    credentialDocuments: credentialDocuments.length,
    statusHistoryEntries: statusHistory.length,
    profileExtensions: extensionPopulation.profilePopulatedCount,
    authorizations: extensionPopulation.authorizationPopulatedCount,
    extensionPopulation: {
      profileEligibleCount: extensionPopulation.profileEligibleCount,
      profileMissingSourceCount: extensionPopulation.profileMissingSourceCount,
      authorizationEligibleCount: extensionPopulation.authorizationEligibleCount,
      authorizationMissingSourceCount: extensionPopulation.authorizationMissingSourceCount,
      authorizationDeferredCount: extensionPopulation.authorizationDeferredCount,
      evidenceLinkedCount: extensionPopulation.evidenceLinkedCount,
    },
  };
};
