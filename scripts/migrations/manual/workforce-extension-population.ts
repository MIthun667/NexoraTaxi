import {
  CredentialDocumentType,
  Prisma,
  PrismaClient,
  WorkforceAuthorizationStatus,
  WorkforceAuthorizationType,
} from '@prisma/client';
import { createHash } from 'crypto';

const POPULATION_VERSION = 'workforce-extension-population.v1';

export type WorkforceExtensionPopulationMode = 'apply' | 'verify';

export type WorkforceExtensionPopulationSummary = {
  profileEligibleCount: number;
  profilePopulatedCount: number;
  profileMissingSourceCount: number;
  profileMissingTargetWorkforceIds: string[];
  authorizationEligibleCount: number;
  authorizationPopulatedCount: number;
  authorizationMissingSourceCount: number;
  authorizationDeferredCount: number;
  authorizationMissingTargetWorkforceIds: string[];
  authorizationDeferredWorkforceIds: string[];
  evidenceLinkedCount: number;
};

type WorkforceExtensionPopulationOptions = {
  organizationId?: string;
  mode?: WorkforceExtensionPopulationMode;
  now?: Date;
};

type CompatibilityMetadata = Record<string, unknown> | null;

type CompatibilitySource = {
  joinedAt: Date | null;
  licenseNumber: string | null;
  licenseIssuedAt: Date | null;
  licenseExpiresAt: Date | null;
  compatibilitySource: string | null;
  writeOwner: string | null;
};

const deterministicPopulationUuid = (seed: string): string => {
  const digest = createHash('sha256')
    .update(`${POPULATION_VERSION}:${seed}`)
    .digest('hex');

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `${((parseInt(digest.slice(16, 17), 16) & 0x3) | 0x8).toString(16)}${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join('-');
};

const asObject = (value: Prisma.JsonValue | null): CompatibilityMetadata =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const readNullableString = (metadata: CompatibilityMetadata, key: string): string | null => {
  const value = metadata?.[key];

  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

const readDate = (metadata: CompatibilityMetadata, key: string): Date | null => {
  const value = metadata?.[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const extractCompatibilitySource = (metadata: CompatibilityMetadata): CompatibilitySource => ({
  joinedAt: readDate(metadata, 'joinedAt'),
  licenseNumber: readNullableString(metadata, 'licenseNumber'),
  licenseIssuedAt: readDate(metadata, 'licenseIssuedAt'),
  licenseExpiresAt: readDate(metadata, 'licenseExpiresAt'),
  compatibilitySource: readNullableString(metadata, 'compatibilitySource'),
  writeOwner: readNullableString(metadata, 'writeOwner'),
});

const buildProfileMetadata = (
  compatibilityMetadata: CompatibilityMetadata,
  source: CompatibilitySource,
): Prisma.InputJsonObject => ({
  ...(compatibilityMetadata ?? {}),
  extensionPopulation: {
    version: POPULATION_VERSION,
    populatedFrom: 'workforce-compatibility-metadata',
    mappedField: 'joinedAt',
    compatibilitySource: source.compatibilitySource,
    writeOwner: source.writeOwner,
  },
});

const buildAuthorizationMetadata = (
  compatibilityMetadata: CompatibilityMetadata,
  source: CompatibilitySource,
  evidenceDocumentId: string | null,
): Prisma.InputJsonObject => ({
  ...(compatibilityMetadata ?? {}),
  extensionPopulation: {
    version: POPULATION_VERSION,
    populatedFrom: 'workforce-compatibility-metadata',
    mappedFields: ['licenseNumber', 'licenseIssuedAt', 'licenseExpiresAt'],
    compatibilitySource: source.compatibilitySource,
    writeOwner: source.writeOwner,
    evidenceDocumentLinked: evidenceDocumentId !== null,
    derivedStatusRule: source.licenseExpiresAt ? 'expired-if-past-else-pending' : 'pending',
  },
});

const mergeJsonMetadata = (
  existing: Prisma.JsonValue | null,
  incoming: Prisma.InputJsonObject,
): Prisma.InputJsonObject => ({
  ...(asObject(existing) ?? {}),
  ...incoming,
});

const deriveAuthorizationStatus = (
  licenseExpiresAt: Date | null,
  now: Date,
): WorkforceAuthorizationStatus =>
  licenseExpiresAt && licenseExpiresAt.getTime() < now.getTime()
    ? WorkforceAuthorizationStatus.EXPIRED
    : WorkforceAuthorizationStatus.PENDING;

export async function populateWorkforceExtensionsFromCompatibility(
  prisma: PrismaClient,
  options: WorkforceExtensionPopulationOptions = {},
): Promise<WorkforceExtensionPopulationSummary> {
  const mode = options.mode ?? 'apply';
  const now = options.now ?? new Date();

  const workforceMembers = await prisma.workforceMember.findMany({
    where: options.organizationId ? { organizationId: options.organizationId } : undefined,
    select: {
      id: true,
      organizationId: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      profileExtension: {
        select: {
          id: true,
          engagementStartDate: true,
          metadata: true,
        },
      },
      authorizations: {
        where: { authorizationType: WorkforceAuthorizationType.LICENSE },
        select: {
          id: true,
          identifierValue: true,
          issuingAuthority: true,
          issuedAt: true,
          expiresAt: true,
          status: true,
          evidenceDocumentId: true,
          metadata: true,
        },
      },
      credentialDocuments: {
        where: { documentType: CredentialDocumentType.LICENSE },
        select: {
          id: true,
          issuingAuthority: true,
        },
      },
    },
  });

  const candidateMembers = workforceMembers.filter((member) => {
    const metadata = asObject(member.metadata);
    return (
      readDate(metadata, 'joinedAt') !== null ||
      readNullableString(metadata, 'licenseNumber') !== null ||
      readDate(metadata, 'licenseIssuedAt') !== null ||
      readDate(metadata, 'licenseExpiresAt') !== null ||
      readNullableString(metadata, 'compatibilitySource') !== null
    );
  });

  let profileEligibleCount = 0;
  let profileMissingSourceCount = 0;
  let authorizationEligibleCount = 0;
  let authorizationMissingSourceCount = 0;
  let authorizationDeferredCount = 0;
  let evidenceLinkedCount = 0;

  for (const member of candidateMembers) {
    const compatibilityMetadata = asObject(member.metadata);
    const source = extractCompatibilitySource(compatibilityMetadata);
    const canonicalJoinedAt = source.joinedAt;
    const licenseAuthorizations = member.authorizations;
    const licenseDocuments = member.credentialDocuments;
    const uniqueLicenseDocument =
      licenseDocuments.length === 1 ? licenseDocuments[0] : null;
    const evidenceDocumentId = uniqueLicenseDocument?.id ?? null;
    const issuingAuthority = uniqueLicenseDocument?.issuingAuthority ?? null;

    if (canonicalJoinedAt) {
      profileEligibleCount += 1;

      if (mode === 'apply') {
        if (!member.profileExtension) {
          await prisma.workforceProfileExtension.upsert({
            where: { workforceMemberId: member.id },
            update: {
              engagementStartDate: canonicalJoinedAt,
              metadata: buildProfileMetadata(compatibilityMetadata, source),
            },
            create: {
              id: deterministicPopulationUuid(`profile:${member.id}`),
              organizationId: member.organizationId,
              workforceMemberId: member.id,
              engagementStartDate: canonicalJoinedAt,
              metadata: buildProfileMetadata(compatibilityMetadata, source),
              createdAt: member.createdAt,
              updatedAt: member.updatedAt,
            },
          });
        } else if (member.profileExtension.engagementStartDate === null) {
          await prisma.workforceProfileExtension.update({
            where: { workforceMemberId: member.id },
            data: {
              engagementStartDate: canonicalJoinedAt,
              metadata: mergeJsonMetadata(
                member.profileExtension.metadata,
                buildProfileMetadata(compatibilityMetadata, source),
              ),
            },
          });
        }
      }
    } else {
      profileMissingSourceCount += 1;
    }

    if (source.licenseNumber) {
      authorizationEligibleCount += 1;

      if (licenseAuthorizations.length > 1) {
        authorizationDeferredCount += 1;
        continue;
      }

      if (mode === 'apply') {
        const status = deriveAuthorizationStatus(source.licenseExpiresAt, now);
        const evidenceDocumentExists = evidenceDocumentId
          ? await prisma.credentialDocument.findUnique({
              where: { id: evidenceDocumentId },
              select: { id: true },
            })
          : null;
        const safeEvidenceDocumentId = evidenceDocumentExists?.id ?? null;

        if (licenseAuthorizations.length === 0) {
          const createdAuthorization = await prisma.workforceAuthorization.create({
            data: {
              id: deterministicPopulationUuid(`authorization:${member.id}:license`),
              organizationId: member.organizationId,
              workforceMemberId: member.id,
              authorizationType: WorkforceAuthorizationType.LICENSE,
              identifierValue: source.licenseNumber,
              issuingAuthority,
              issuedAt: source.licenseIssuedAt,
              expiresAt: source.licenseExpiresAt,
              status,
              metadata: buildAuthorizationMetadata(
                compatibilityMetadata,
                source,
                safeEvidenceDocumentId,
              ),
              createdAt: member.createdAt,
              updatedAt: member.updatedAt,
            },
          });

          if (safeEvidenceDocumentId) {
            await prisma.workforceAuthorization.update({
              where: { id: createdAuthorization.id },
              data: {
                evidenceDocument: {
                  connect: { id: safeEvidenceDocumentId },
                },
              },
            });
          }
        } else {
          const existingAuthorization = licenseAuthorizations[0];
          const updateData: Prisma.WorkforceAuthorizationUpdateInput = {};

          if (!existingAuthorization.identifierValue) {
            updateData.identifierValue = source.licenseNumber;
          }

          if (!existingAuthorization.issuedAt && source.licenseIssuedAt) {
            updateData.issuedAt = source.licenseIssuedAt;
          }

          if (!existingAuthorization.expiresAt && source.licenseExpiresAt) {
            updateData.expiresAt = source.licenseExpiresAt;
          }

          if (!existingAuthorization.issuingAuthority && issuingAuthority) {
            updateData.issuingAuthority = issuingAuthority;
          }

          if (!existingAuthorization.evidenceDocumentId && safeEvidenceDocumentId) {
            updateData.evidenceDocument = {
              connect: { id: safeEvidenceDocumentId },
            };
          }

          if (
            existingAuthorization.status === WorkforceAuthorizationStatus.PENDING &&
            status === WorkforceAuthorizationStatus.EXPIRED
          ) {
            updateData.status = WorkforceAuthorizationStatus.EXPIRED;
          }

          const mergedMetadata = mergeJsonMetadata(
            existingAuthorization.metadata,
            buildAuthorizationMetadata(compatibilityMetadata, source, evidenceDocumentId),
          );
          updateData.metadata = mergedMetadata;

          if (Object.keys(updateData).length > 0) {
            await prisma.workforceAuthorization.update({
              where: { id: existingAuthorization.id },
              data: updateData,
            });
          }
        }
      }
    } else if (source.licenseIssuedAt || source.licenseExpiresAt) {
      authorizationMissingSourceCount += 1;
    }

    if (evidenceDocumentId) {
      evidenceLinkedCount += 1;
    }
  }

  const eligibleProfileIds = candidateMembers
    .filter((member) => extractCompatibilitySource(asObject(member.metadata)).joinedAt !== null)
    .map((member) => member.id);

  const eligibleAuthorizationIds = candidateMembers
    .filter((member) => extractCompatibilitySource(asObject(member.metadata)).licenseNumber !== null)
    .map((member) => member.id);

  const profileExtensions = eligibleProfileIds.length
    ? await prisma.workforceProfileExtension.findMany({
        where: { workforceMemberId: { in: eligibleProfileIds } },
        select: {
          workforceMemberId: true,
          engagementStartDate: true,
        },
      })
    : [];

  const licenseAuthorizations = eligibleAuthorizationIds.length
    ? await prisma.workforceAuthorization.findMany({
        where: {
          workforceMemberId: { in: eligibleAuthorizationIds },
          authorizationType: WorkforceAuthorizationType.LICENSE,
        },
        select: {
          workforceMemberId: true,
          identifierValue: true,
        },
      })
    : [];

  const populatedProfileIds = new Set(
    profileExtensions
      .filter((profile) => profile.engagementStartDate !== null)
      .map((profile) => profile.workforceMemberId),
  );

  const populatedAuthorizationIds = new Set(
    licenseAuthorizations
      .filter((authorization) => authorization.identifierValue !== null)
      .map((authorization) => authorization.workforceMemberId),
  );

  const deferredAuthorizationIds = new Set(
    candidateMembers
      .filter((member) => {
        const source = extractCompatibilitySource(asObject(member.metadata));
        return source.licenseNumber !== null && member.authorizations.length > 1;
      })
      .map((member) => member.id),
  );

  return {
    profileEligibleCount,
    profilePopulatedCount: populatedProfileIds.size,
    profileMissingSourceCount,
    profileMissingTargetWorkforceIds: eligibleProfileIds.filter((id) => !populatedProfileIds.has(id)),
    authorizationEligibleCount,
    authorizationPopulatedCount: populatedAuthorizationIds.size,
    authorizationMissingSourceCount,
    authorizationDeferredCount,
    authorizationMissingTargetWorkforceIds: eligibleAuthorizationIds.filter(
      (id) => !populatedAuthorizationIds.has(id) && !deferredAuthorizationIds.has(id),
    ),
    authorizationDeferredWorkforceIds: [...deferredAuthorizationIds],
    evidenceLinkedCount,
  };
}
