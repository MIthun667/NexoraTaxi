import {
  AssetType,
  ApprovalDecisionType,
  ApprovalRequestStatus,
  ApprovalStepStatus,
  CredentialDocumentType,
  CredentialVerificationStatus,
  DepartmentStatus,
  EmploymentStatus,
  IncidentActionType,
  IncidentSeverity,
  NotificationCategory,
  NotificationSeverity,
  NotificationStatus,
  OperationalIncidentStatus,
  OperationalZoneType,
  OrganizationLifecycleStatus,
  OrganizationStatus,
  PositionStatus,
  Prisma,
  PrismaClient,
  TaskActionType,
  UserStatus,
  WorkforceAuthorizationType,
  WorkforceAvailabilityStatus,
  WorkforceComplianceStatus,
  WorkforceEmploymentModel,
  WorkforceMemberType,
  WorkforceOperationalStatus,
  WorkforceStatusCategory,
  WorkflowInstanceStatus,
  WorkflowTaskStatus,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@prisma/client';

import { populateWorkforceExtensionsFromCompatibility } from '../../../migrations/manual/workforce-extension-population';
import { deterministicGlobalSeedUuid, deterministicPackUuid } from './deterministic-id';
import {
  seedAiPlatformEnrichment,
  type AiPlatformEnrichmentProfile,
  type AiPlatformEnrichmentResult,
} from './seed-ai-platform-enrichment';
import {
  seedBillingEnrichment,
  type BillingEnrichmentProfile,
  type BillingEnrichmentResult,
} from './seed-billing-enrichment';
import {
  seedConnectorsEnrichment,
  type ConnectorsEnrichmentProfile,
  type ConnectorsEnrichmentResult,
} from './seed-connectors-enrichment';
import {
  seedObservabilityEnrichment,
  type ObservabilityEnrichmentProfile,
  type ObservabilityEnrichmentResult,
} from './seed-observability-enrichment';

export type SeedPackKey = 'CORE_ONLY' | 'SAAS' | 'LOGISTICS' | 'REVOPS' | 'ALL';

export type SeedFeatureAvailability = {
  workforce: boolean;
  workforceExtensions: boolean;
  workflows: boolean;
  workOrders: boolean;
  assets: boolean;
  incidents: boolean;
  notifications: boolean;
  domainEvents: boolean;
  zones: boolean;
  tenancy: boolean;
  connectors: boolean;
  observability: boolean;
  aiPlatform: boolean;
};

type DepartmentBlueprint = {
  code: string;
  name: string;
  description: string;
  status?: DepartmentStatus;
};

type PositionBlueprint = {
  code: string;
  title: string;
  departmentCode: string | null;
  description: string;
  gradeLevel?: string | null;
  status?: PositionStatus;
};

type TeamMemberBlueprint = {
  key: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  departmentCode: string | null;
  positionCode: string | null;
  roleCodes: string[];
  employmentStatus?: EmploymentStatus;
  userStatus?: UserStatus;
  workerType?: WorkforceMemberType;
  employmentModel?: WorkforceEmploymentModel;
  operationalStatus?: WorkforceOperationalStatus;
  complianceStatus?: WorkforceComplianceStatus;
  availabilityStatus?: WorkforceAvailabilityStatus;
  engagementStartDate?: Date | null;
  skills?: string[];
  license?: {
    identifierValue: string;
    issuedAt?: Date | null;
    expiresAt?: Date | null;
    issuingAuthority?: string | null;
  } | null;
};

type WorkflowScenarioBlueprint = {
  key: string;
  definitionCode: string;
  definitionName: string;
  definitionDescription: string;
  moduleKey: string;
  entityType: string;
  entityId: string;
  createdByMemberKey: string;
  status?: WorkflowInstanceStatus;
  task: {
    key: string;
    title: string;
    description?: string;
    status?: WorkflowTaskStatus;
    assigneeMemberKey?: string | null;
    assigneeRoleCode?: string | null;
  };
  approval?: {
    title: string;
    description?: string;
    requestedByMemberKey: string;
    status?: ApprovalRequestStatus;
    step: {
      key: string;
      title: string;
      description?: string;
      status?: ApprovalStepStatus;
      approverMemberKey?: string | null;
      approverRoleCode?: string | null;
      decisionType?: ApprovalDecisionType;
      decisionComment?: string | null;
    };
  };
};

type ZoneBlueprint = {
  code: string;
  name: string;
  type: OperationalZoneType;
  description: string;
  parentCode?: string | null;
};

type WorkOrderBlueprint = {
  code: string;
  title: string;
  description: string;
  workType: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  createdByMemberKey: string;
  zoneCode?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

type AssetBlueprint = {
  code: string;
  name: string;
  assetType: AssetType;
  assetClass: string;
  serialNumber?: string | null;
  registrationNumber?: string | null;
  zoneCode?: string | null;
  metadata?: Prisma.InputJsonValue;
};

type IncidentBlueprint = {
  code: string;
  title: string;
  description: string;
  incidentType: string;
  severity: IncidentSeverity;
  status: OperationalIncidentStatus;
  zoneCode?: string | null;
  workOrderCode?: string | null;
  workforceMemberKey?: string | null;
  assetCode?: string | null;
  reportedByMemberKey: string;
  assignedToMemberKey?: string | null;
  actionSummary?: string | null;
};

type NotificationBlueprint = {
  key: string;
  recipientMemberKey: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  status?: NotificationStatus;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
};

type DomainEventBlueprint = {
  key: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  actorMemberKey?: string | null;
  sourceModule: string;
  payload: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
};

export type CompanySeedBlueprint = {
  packKey: string;
  packNamespace: string;
  organization: {
    name: string;
    slug: string;
    status?: OrganizationStatus;
    lifecycleStatus?: OrganizationLifecycleStatus;
  };
  departments: DepartmentBlueprint[];
  positions: PositionBlueprint[];
  team: TeamMemberBlueprint[];
  workflows?: WorkflowScenarioBlueprint[];
  zones?: ZoneBlueprint[];
  workOrders?: WorkOrderBlueprint[];
  assets?: AssetBlueprint[];
  incidents?: IncidentBlueprint[];
  notifications?: NotificationBlueprint[];
  domainEvents?: DomainEventBlueprint[];
  enrichments?: {
    tenancy?: BillingEnrichmentProfile;
    connectors?: ConnectorsEnrichmentProfile;
    observability?: ObservabilityEnrichmentProfile;
    aiPlatform?: AiPlatformEnrichmentProfile;
  };
};

export type PackEnrichmentSummary = {
  modulesUsed: string[];
  tenancy: BillingEnrichmentResult;
  connectors: ConnectorsEnrichmentResult;
  observability: ObservabilityEnrichmentResult;
  aiPlatform: AiPlatformEnrichmentResult;
};

export type PackSeedSummary = {
  packKey: string;
  organizationSlug: string;
  organizations: number;
  departments: number;
  positions: number;
  users: number;
  employees: number;
  workforce: number;
  workflowDefinitions: number;
  workflowInstances: number;
  workflowTasks: number;
  approvalRequests: number;
  approvalSteps: number;
  approvalDecisions: number;
  workOrders: number;
  assets: number;
  incidents: number;
  incidentActions: number;
  notifications: number;
  domainEvents: number;
  zones: number;
  workforceProfileExtensions: number;
  workforceAuthorizations: number;
  enrichments: PackEnrichmentSummary;
};

const BASE_ROLES = [
  {
    code: 'UNIVERSAL_ADMIN',
    name: 'Universal Administrator',
    description: 'Owns cross-platform administration and governance.',
  },
  {
    code: 'TEAM_MANAGER',
    name: 'Team Manager',
    description: 'Leads team execution, approvals, and coordination.',
  },
  {
    code: 'PLATFORM_OPERATOR',
    name: 'Platform Operator',
    description: 'Executes operational work, workflows, and response actions.',
  },
] as const;

const BASE_PERMISSIONS = [
  { code: 'organization.read', name: 'Organization Read' },
  { code: 'organization.manage', name: 'Organization Manage' },
  { code: 'workforce.read', name: 'Workforce Read' },
  { code: 'workforce.manage', name: 'Workforce Manage' },
  { code: 'workflow.read', name: 'Workflow Read' },
  { code: 'workflow.manage', name: 'Workflow Manage' },
  { code: 'workflow.execute', name: 'Workflow Execute' },
  { code: 'approval.read', name: 'Approval Read' },
  { code: 'approval.review', name: 'Approval Review' },
  { code: 'workorder.read', name: 'Work Order Read' },
  { code: 'workorder.manage', name: 'Work Order Manage' },
  { code: 'asset.read', name: 'Asset Read' },
  { code: 'asset.manage', name: 'Asset Manage' },
  { code: 'incident.read', name: 'Incident Read' },
  { code: 'incident.manage', name: 'Incident Manage' },
  { code: 'analytics.read', name: 'Analytics Read' },
  { code: 'notification.read', name: 'Notification Read' },
  { code: 'notification.manage', name: 'Notification Manage' },
  { code: 'intelligence.read', name: 'Intelligence Read' },
  { code: 'intelligence.manage', name: 'Intelligence Manage' },
] as const;

const BASE_ROLE_PERMISSIONS: Record<string, string[]> = {
  UNIVERSAL_ADMIN: BASE_PERMISSIONS.map((permission) => permission.code),
  TEAM_MANAGER: [
    'organization.read',
    'workforce.read',
    'workforce.manage',
    'workflow.read',
    'workflow.manage',
    'workflow.execute',
    'approval.read',
    'approval.review',
    'workorder.read',
    'workorder.manage',
    'asset.read',
    'asset.manage',
    'incident.read',
    'incident.manage',
    'analytics.read',
    'notification.read',
    'notification.manage',
    'intelligence.read',
  ],
  PLATFORM_OPERATOR: [
    'organization.read',
    'workforce.read',
    'workflow.read',
    'workflow.execute',
    'approval.read',
    'workorder.read',
    'asset.read',
    'incident.read',
    'notification.read',
    'intelligence.read',
  ],
};

const jsonObject = (value: Record<string, unknown>): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

const fullName = (member: TeamMemberBlueprint): string => `${member.firstName} ${member.lastName}`;

const workforceMetadata = (
  pack: CompanySeedBlueprint,
  member: TeamMemberBlueprint,
): Prisma.InputJsonValue => {
  const metadata: Record<string, unknown> = {
    seeded: true,
    seedPack: pack.packKey,
    compatibilitySource: `seed-pack:${pack.packKey}`,
    writeOwner: 'workforce',
  };

  if (member.engagementStartDate) {
    metadata.joinedAt = member.engagementStartDate.toISOString();
  }

  if (member.license?.identifierValue) {
    metadata.licenseNumber = member.license.identifierValue;
    metadata.licenseIssuedAt = member.license.issuedAt?.toISOString() ?? null;
    metadata.licenseExpiresAt = member.license.expiresAt?.toISOString() ?? null;
    metadata.extensionOwnership = {
      joinedAt: member.engagementStartDate ? 'workforce-profile-extension' : null,
      license: 'workforce-authorization',
      metadataRole: 'fallback-sync',
    };
  } else if (member.engagementStartDate) {
    metadata.extensionOwnership = {
      joinedAt: 'workforce-profile-extension',
      metadataRole: 'fallback-sync',
    };
  }

  return jsonObject(metadata);
};

const userIdForMember = (packNamespace: string, memberKey: string): string =>
  deterministicPackUuid(packNamespace, `user:${memberKey}`);

const employeeIdForMember = (packNamespace: string, memberKey: string): string =>
  deterministicPackUuid(packNamespace, `employee:${memberKey}`);

const workforceIdForMember = (packNamespace: string, memberKey: string): string =>
  deterministicPackUuid(packNamespace, `workforce:${memberKey}`);

const workerCodeForMember = (packKey: string, memberKey: string): string =>
  `${packKey.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)}-WF-${memberKey
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()}`;

const employeeCodeForMember = (packKey: string, memberKey: string): string =>
  `${packKey.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)}-EMP-${memberKey
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()}`;

export const ensureBaseAccessControl = async (prisma: PrismaClient): Promise<void> => {
  await prisma.role.createMany({
    data: BASE_ROLES.map((role) => ({
      id: deterministicGlobalSeedUuid(`role:${role.code}`),
      code: role.code,
      name: role.name,
      description: role.description,
    })),
    skipDuplicates: true,
  });

  await prisma.permission.createMany({
    data: BASE_PERMISSIONS.map((permission) => ({
      id: deterministicGlobalSeedUuid(`permission:${permission.code}`),
      code: permission.code,
      name: permission.name,
      description: `${permission.name} permission for universal pack demos.`,
    })),
    skipDuplicates: true,
  });

  const rolePermissionRows = Object.entries(BASE_ROLE_PERMISSIONS).flatMap(([roleCode, permissionCodes]) =>
    permissionCodes.map((permissionCode) => ({
      id: deterministicGlobalSeedUuid(`role-permission:${roleCode}:${permissionCode}`),
      roleId: deterministicGlobalSeedUuid(`role:${roleCode}`),
      permissionId: deterministicGlobalSeedUuid(`permission:${permissionCode}`),
    })),
  );

  await prisma.rolePermission.createMany({ data: rolePermissionRows, skipDuplicates: true });
};

export const seedCompanyPack = async (
  prisma: PrismaClient,
  blueprint: CompanySeedBlueprint,
  featureAvailability: SeedFeatureAvailability,
  now: Date,
): Promise<PackSeedSummary> => {
  const canonicalOrganizationId = deterministicPackUuid(blueprint.packNamespace, 'organization');

  const organization = await prisma.organization.upsert({
    where: { slug: blueprint.organization.slug },
    update: {
      name: blueprint.organization.name,
      status: blueprint.organization.status ?? OrganizationStatus.ACTIVE,
      lifecycleStatus:
        blueprint.organization.lifecycleStatus ?? OrganizationLifecycleStatus.ACTIVE_CUSTOMER,
    },
    create: {
      id: canonicalOrganizationId,
      name: blueprint.organization.name,
      slug: blueprint.organization.slug,
      status: blueprint.organization.status ?? OrganizationStatus.ACTIVE,
      lifecycleStatus:
        blueprint.organization.lifecycleStatus ?? OrganizationLifecycleStatus.ACTIVE_CUSTOMER,
    },
  });
  const organizationId = organization.id;

  const departmentRows = blueprint.departments.map((department) => ({
    id: deterministicPackUuid(blueprint.packNamespace, `department:${department.code}`),
    organizationId,
    code: department.code,
    name: department.name,
    description: department.description,
    status: department.status ?? DepartmentStatus.ACTIVE,
  }));
  await prisma.department.createMany({ data: departmentRows, skipDuplicates: true });
  const departmentByCode = new Map(departmentRows.map((department) => [department.code, department.id]));

  const positionRows = blueprint.positions.map((position) => ({
    id: deterministicPackUuid(blueprint.packNamespace, `position:${position.code}`),
    organizationId,
    code: position.code,
    title: position.title,
    description: position.description,
    gradeLevel: position.gradeLevel ?? null,
    status: position.status ?? PositionStatus.ACTIVE,
    departmentId: position.departmentCode ? departmentByCode.get(position.departmentCode) ?? null : null,
  }));
  await prisma.position.createMany({ data: positionRows, skipDuplicates: true });
  const positionByCode = new Map(positionRows.map((position) => [position.code, position.id]));

  const userRows = blueprint.team.map((member) => ({
    id: userIdForMember(blueprint.packNamespace, member.key),
    organizationId,
    email: member.email,
    passwordHash: '$2b$10$5MHiKZngeNjNV1ehncgcrOnbKldwVFazxCSxFc0TLKKTgjubJNrKC',
    firstName: member.firstName,
    lastName: member.lastName,
    status: member.userStatus ?? UserStatus.ACTIVE,
  }));
  await prisma.user.createMany({ data: userRows, skipDuplicates: true });
  const userIdByMemberKey = new Map(blueprint.team.map((member) => [member.key, userIdForMember(blueprint.packNamespace, member.key)]));

  const employeeRows = blueprint.team.map((member) => ({
    id: employeeIdForMember(blueprint.packNamespace, member.key),
    organizationId,
    employeeCode: employeeCodeForMember(blueprint.packKey, member.key),
    firstName: member.firstName,
    lastName: member.lastName,
    workEmail: member.email,
    phoneNumber: member.phoneNumber,
    employmentStatus: member.employmentStatus ?? EmploymentStatus.ACTIVE,
    hireDate: member.engagementStartDate ?? now,
    departmentId: member.departmentCode ? departmentByCode.get(member.departmentCode) ?? null : null,
    positionId: member.positionCode ? positionByCode.get(member.positionCode) ?? null : null,
    userId: userIdByMemberKey.get(member.key) ?? null,
  }));
  await prisma.employee.createMany({ data: employeeRows, skipDuplicates: true });

  const userRoleRows = blueprint.team.flatMap((member) =>
    member.roleCodes.map((roleCode) => ({
      id: deterministicPackUuid(blueprint.packNamespace, `user-role:${member.key}:${roleCode}`),
      userId: userIdByMemberKey.get(member.key)!,
      roleId: deterministicGlobalSeedUuid(`role:${roleCode}`),
    })),
  );
  await prisma.userRole.createMany({ data: userRoleRows, skipDuplicates: true });

  let profileExtensions = 0;
  let authorizations = 0;

  if (featureAvailability.workforce) {
    const workforceRows = blueprint.team.map((member) => ({
      id: workforceIdForMember(blueprint.packNamespace, member.key),
      organizationId,
      employeeId: employeeIdForMember(blueprint.packNamespace, member.key),
      userId: userIdByMemberKey.get(member.key) ?? null,
      workerCode: workerCodeForMember(blueprint.packKey, member.key),
      workerType: member.workerType ?? WorkforceMemberType.EMPLOYEE,
      employmentModel: member.employmentModel ?? WorkforceEmploymentModel.FULL_TIME,
      firstName: member.firstName,
      lastName: member.lastName,
      displayName: fullName(member),
      workEmail: member.email,
      phoneNumber: member.phoneNumber,
      operationalStatus: member.operationalStatus ?? WorkforceOperationalStatus.ACTIVE,
      complianceStatus: member.complianceStatus ?? WorkforceComplianceStatus.COMPLIANT,
      availabilityStatus: member.availabilityStatus ?? WorkforceAvailabilityStatus.AVAILABLE,
      primaryDepartmentId: member.departmentCode ? departmentByCode.get(member.departmentCode) ?? null : null,
      primaryPositionId: member.positionCode ? positionByCode.get(member.positionCode) ?? null : null,
      homeZoneId: null,
      skills: jsonObject(member.skills ? { values: member.skills } : { values: [] }),
      metadata: workforceMetadata(blueprint, member),
    }));
    await prisma.workforceMember.createMany({ data: workforceRows, skipDuplicates: true });

    const credentialRows = blueprint.team
      .filter((member) => member.license?.identifierValue)
      .map((member) => ({
        id: deterministicPackUuid(blueprint.packNamespace, `credential:${member.key}:license`),
        organizationId,
        workforceMemberId: workforceIdForMember(blueprint.packNamespace, member.key),
        documentType: CredentialDocumentType.LICENSE,
        title: `${fullName(member)} Occupational License`,
        documentNumber: member.license?.identifierValue ?? null,
        issuingAuthority: member.license?.issuingAuthority ?? null,
        issuedAt: member.license?.issuedAt ?? null,
        expiresAt: member.license?.expiresAt ?? null,
        verificationStatus: CredentialVerificationStatus.VERIFIED,
        verifiedByUserId: userRows[0]?.id ?? null,
        verifiedAt: member.license?.issuedAt ?? now,
        storageUrl: `https://demo.local/${blueprint.organization.slug}/credentials/${member.key}`,
        metadata: jsonObject({
          seeded: true,
          seedPack: blueprint.packKey,
          compatibilityRole: 'license-evidence',
        }),
      }));
    await prisma.credentialDocument.createMany({ data: credentialRows, skipDuplicates: true });

    const statusRows = blueprint.team.flatMap((member) => {
      const workforceMemberId = workforceIdForMember(blueprint.packNamespace, member.key);
      const changedByUserId = userRows[0]?.id ?? null;
      return [
        {
          id: deterministicPackUuid(blueprint.packNamespace, `wf-status:${member.key}:operational`),
          organizationId,
          workforceMemberId,
          category: WorkforceStatusCategory.OPERATIONAL_STATUS,
          previousValue: 'PENDING',
          nextValue: member.operationalStatus ?? WorkforceOperationalStatus.ACTIVE,
          reason: `Seeded ${blueprint.packKey} workforce baseline`,
          changedByUserId,
          effectiveAt: member.engagementStartDate ?? now,
          metadata: jsonObject({ seeded: true, seedPack: blueprint.packKey }),
        },
        {
          id: deterministicPackUuid(blueprint.packNamespace, `wf-status:${member.key}:availability`),
          organizationId,
          workforceMemberId,
          category: WorkforceStatusCategory.AVAILABILITY_STATUS,
          previousValue: WorkforceAvailabilityStatus.AVAILABLE,
          nextValue: member.availabilityStatus ?? WorkforceAvailabilityStatus.AVAILABLE,
          reason: `Seeded ${blueprint.packKey} staffing availability`,
          changedByUserId,
          effectiveAt: member.engagementStartDate ?? now,
          metadata: jsonObject({ seeded: true, seedPack: blueprint.packKey }),
        },
      ];
    });
    await prisma.workforceStatusHistory.createMany({ data: statusRows, skipDuplicates: true });

    if (featureAvailability.workforceExtensions) {
      const extensionPopulation = await populateWorkforceExtensionsFromCompatibility(prisma, {
        organizationId,
        mode: 'apply',
        now,
      });
      profileExtensions = extensionPopulation.profilePopulatedCount;
      authorizations = extensionPopulation.authorizationPopulatedCount;
    }
  }

  const zoneRows =
    featureAvailability.zones && blueprint.zones
      ? blueprint.zones.map((zone) => ({
          id: deterministicPackUuid(blueprint.packNamespace, `zone:${zone.code}`),
          organizationId,
          zoneCode: zone.code,
          name: zone.name,
          zoneType: zone.type,
          description: zone.description,
          parentZoneId: zone.parentCode
            ? deterministicPackUuid(blueprint.packNamespace, `zone:${zone.parentCode}`)
            : null,
          coverageDefinition: jsonObject({ seeded: true, pack: blueprint.packKey }),
          metadata: jsonObject({ seeded: true, seedPack: blueprint.packKey }),
        }))
      : [];
  if (zoneRows.length > 0) {
    await prisma.operationalZone.createMany({ data: zoneRows, skipDuplicates: true });
  }
  const zoneIdByCode = new Map(zoneRows.map((zone) => [zone.zoneCode, zone.id]));

  const assetRows =
    featureAvailability.assets && blueprint.assets
      ? blueprint.assets.map((asset) => ({
          id: deterministicPackUuid(blueprint.packNamespace, `asset:${asset.code}`),
          organizationId,
          ownerOrganizationId: organizationId,
          assetCode: asset.code,
          assetType: asset.assetType,
          assetClass: asset.assetClass,
          name: asset.name,
          serialNumber: asset.serialNumber ?? null,
          registrationNumber: asset.registrationNumber ?? null,
          operationalStatus: 'ACTIVE',
          complianceStatus: 'COMPLIANT',
          availabilityStatus: 'AVAILABLE',
          zoneId: asset.zoneCode ? zoneIdByCode.get(asset.zoneCode) ?? null : null,
          specifications: jsonObject({ seeded: true, archetype: blueprint.packKey }),
          metadata: asset.metadata ?? jsonObject({ seeded: true, seedPack: blueprint.packKey }),
        }))
      : [];
  if (assetRows.length > 0) {
    await prisma.asset.createMany({ data: assetRows, skipDuplicates: true });
  }
  const assetIdByCode = new Map(assetRows.map((asset) => [asset.assetCode, asset.id]));

  const workOrderRows =
    featureAvailability.workOrders && blueprint.workOrders
      ? blueprint.workOrders.map((workOrder) => ({
          id: deterministicPackUuid(blueprint.packNamespace, `work-order:${workOrder.code}`),
          organizationId,
          workOrderCode: workOrder.code,
          title: workOrder.title,
          description: workOrder.description,
          workType: workOrder.workType,
          status: workOrder.status,
          priority: workOrder.priority,
          zoneId: workOrder.zoneCode ? zoneIdByCode.get(workOrder.zoneCode) ?? null : null,
          createdByUserId: userIdByMemberKey.get(workOrder.createdByMemberKey) ?? null,
          requestedAt: now,
          sourceType: workOrder.sourceType ?? null,
          sourceId: workOrder.sourceId ?? null,
          metadata: workOrder.metadata ?? jsonObject({ seeded: true, seedPack: blueprint.packKey }),
        }))
      : [];
  if (workOrderRows.length > 0) {
    await prisma.workOrder.createMany({ data: workOrderRows, skipDuplicates: true });
  }
  const workOrderIdByCode = new Map(workOrderRows.map((workOrder) => [workOrder.workOrderCode, workOrder.id]));

  const workflowDefinitions = blueprint.workflows ?? [];
  if (featureAvailability.workflows && workflowDefinitions.length > 0) {
    await prisma.workflowDefinition.createMany({
      data: workflowDefinitions.map((workflow) => ({
        id: deterministicPackUuid(blueprint.packNamespace, `workflow-definition:${workflow.definitionCode}`),
        code: workflow.definitionCode,
        name: workflow.definitionName,
        description: workflow.definitionDescription,
        moduleKey: workflow.moduleKey,
        version: 1,
        isActive: true,
      })),
      skipDuplicates: true,
    });

    await prisma.workflowInstance.createMany({
      data: workflowDefinitions.map((workflow) => ({
        id: deterministicPackUuid(blueprint.packNamespace, `workflow-instance:${workflow.key}`),
        definitionId: deterministicPackUuid(
          blueprint.packNamespace,
          `workflow-definition:${workflow.definitionCode}`,
        ),
        organizationId,
        entityType: workflow.entityType,
        entityId: workflow.entityId,
        status: workflow.status ?? WorkflowInstanceStatus.ACTIVE,
        createdByUserId: userIdByMemberKey.get(workflow.createdByMemberKey)!,
      })),
      skipDuplicates: true,
    });

    await prisma.workflowTask.createMany({
      data: workflowDefinitions.map((workflow) => ({
        id: deterministicPackUuid(blueprint.packNamespace, `workflow-task:${workflow.key}:${workflow.task.key}`),
        instanceId: deterministicPackUuid(blueprint.packNamespace, `workflow-instance:${workflow.key}`),
        taskKey: workflow.task.key,
        title: workflow.task.title,
        description: workflow.task.description ?? null,
        status: workflow.task.status ?? WorkflowTaskStatus.PENDING,
        assigneeUserId: workflow.task.assigneeMemberKey
          ? userIdByMemberKey.get(workflow.task.assigneeMemberKey) ?? null
          : null,
        assigneeRoleCode: workflow.task.assigneeRoleCode ?? null,
      })),
      skipDuplicates: true,
    });

    const taskActionRows = workflowDefinitions
      .filter((workflow) => workflow.task.status === WorkflowTaskStatus.COMPLETED)
      .map((workflow) => ({
        id: deterministicPackUuid(
          blueprint.packNamespace,
          `task-action:${workflow.key}:${workflow.task.key}:complete`,
        ),
        taskId: deterministicPackUuid(blueprint.packNamespace, `workflow-task:${workflow.key}:${workflow.task.key}`),
        actionType: TaskActionType.COMPLETE,
        actionLabel: 'Complete',
        actorUserId:
          userIdByMemberKey.get(workflow.task.assigneeMemberKey ?? workflow.createdByMemberKey) ?? null,
        comment: 'Seeded completed task action for demo traceability.',
        metadata: jsonObject({ seeded: true, seedPack: blueprint.packKey }),
      }))
      .filter((action): action is NonNullable<typeof action> => Boolean(action.actorUserId));

    if (taskActionRows.length > 0) {
      await prisma.taskAction.createMany({ data: taskActionRows, skipDuplicates: true });
    }

    const approvalDefinitions = workflowDefinitions.filter((workflow) => workflow.approval);
    if (approvalDefinitions.length > 0) {
      await prisma.approvalRequest.createMany({
        data: approvalDefinitions.map((workflow) => ({
          id: deterministicPackUuid(blueprint.packNamespace, `approval-request:${workflow.key}`),
          organizationId,
          workflowInstanceId: deterministicPackUuid(blueprint.packNamespace, `workflow-instance:${workflow.key}`),
          entityType: workflow.entityType,
          entityId: workflow.entityId,
          title: workflow.approval!.title,
          description: workflow.approval!.description ?? null,
          status: workflow.approval!.status ?? ApprovalRequestStatus.PENDING,
          requestedByUserId: userIdByMemberKey.get(workflow.approval!.requestedByMemberKey)!,
        })),
        skipDuplicates: true,
      });

      await prisma.approvalStep.createMany({
        data: approvalDefinitions.map((workflow) => ({
          id: deterministicPackUuid(
            blueprint.packNamespace,
            `approval-step:${workflow.key}:${workflow.approval!.step.key}`,
          ),
          approvalRequestId: deterministicPackUuid(blueprint.packNamespace, `approval-request:${workflow.key}`),
          stepKey: workflow.approval!.step.key,
          title: workflow.approval!.step.title,
          description: workflow.approval!.step.description ?? null,
          sequenceOrder: 1,
          status: workflow.approval!.step.status ?? ApprovalStepStatus.PENDING,
          approverUserId: workflow.approval!.step.approverMemberKey
            ? userIdByMemberKey.get(workflow.approval!.step.approverMemberKey) ?? null
            : null,
          approverRoleCode: workflow.approval!.step.approverRoleCode ?? null,
        })),
        skipDuplicates: true,
      });

      const decisionRows = approvalDefinitions
        .filter((workflow) => workflow.approval?.step.decisionType)
        .map((workflow) => ({
          id: deterministicPackUuid(
            blueprint.packNamespace,
            `approval-decision:${workflow.key}:${workflow.approval!.step.key}`,
          ),
          approvalStepId: deterministicPackUuid(
            blueprint.packNamespace,
            `approval-step:${workflow.key}:${workflow.approval!.step.key}`,
          ),
          actorUserId:
            userIdByMemberKey.get(
              workflow.approval!.step.approverMemberKey ?? workflow.approval!.requestedByMemberKey,
            ) ?? null,
          decisionType: workflow.approval!.step.decisionType!,
          comment: workflow.approval!.step.decisionComment ?? null,
          metadata: jsonObject({ seeded: true, seedPack: blueprint.packKey }),
        }))
        .filter((decision): decision is NonNullable<typeof decision> => Boolean(decision.actorUserId));

      if (decisionRows.length > 0) {
        await prisma.approvalDecision.createMany({ data: decisionRows, skipDuplicates: true });
      }
    }
  }

  const incidentRows =
    featureAvailability.incidents && blueprint.incidents
      ? blueprint.incidents.map((incident) => ({
          id: deterministicPackUuid(blueprint.packNamespace, `incident:${incident.code}`),
          organizationId,
          incidentCode: incident.code,
          incidentType: incident.incidentType,
          title: incident.title,
          description: incident.description,
          severity: incident.severity,
          status: incident.status,
          zoneId: incident.zoneCode ? zoneIdByCode.get(incident.zoneCode) ?? null : null,
          workOrderId: incident.workOrderCode ? workOrderIdByCode.get(incident.workOrderCode) ?? null : null,
          workforceMemberId: incident.workforceMemberKey
            ? workforceIdForMember(blueprint.packNamespace, incident.workforceMemberKey)
            : null,
          assetId: incident.assetCode ? assetIdByCode.get(incident.assetCode) ?? null : null,
          relatedEntityType: incident.workOrderCode ? 'work_order' : null,
          relatedEntityId: incident.workOrderCode ? workOrderIdByCode.get(incident.workOrderCode) ?? null : null,
          reportedByUserId: userIdByMemberKey.get(incident.reportedByMemberKey) ?? null,
          assignedToUserId: incident.assignedToMemberKey
            ? userIdByMemberKey.get(incident.assignedToMemberKey) ?? null
            : null,
          metadata: jsonObject({ seeded: true, seedPack: blueprint.packKey }),
        }))
      : [];
  if (incidentRows.length > 0) {
    await prisma.operationalIncident.createMany({ data: incidentRows, skipDuplicates: true });
  }

  const incidentActionRows =
    featureAvailability.incidents && blueprint.incidents
      ? blueprint.incidents
          .filter((incident) => incident.actionSummary)
          .map((incident) => ({
            id: deterministicPackUuid(blueprint.packNamespace, `incident-action:${incident.code}`),
            organizationId,
            incidentId: deterministicPackUuid(blueprint.packNamespace, `incident:${incident.code}`),
            actionType: IncidentActionType.COMMENT,
            summary: incident.actionSummary!,
            performedByUserId: userIdByMemberKey.get(incident.reportedByMemberKey) ?? null,
            performedAt: now,
            metadata: jsonObject({ seeded: true, seedPack: blueprint.packKey }),
          }))
          .filter((action): action is NonNullable<typeof action> => Boolean(action.performedByUserId))
      : [];
  if (incidentActionRows.length > 0) {
    await prisma.incidentAction.createMany({ data: incidentActionRows, skipDuplicates: true });
  }

  const notificationRows =
    featureAvailability.notifications && blueprint.notifications
      ? blueprint.notifications
          .map((notification) => ({
            id: deterministicPackUuid(blueprint.packNamespace, `notification:${notification.key}`),
            organizationId,
            recipientUserId: userIdByMemberKey.get(notification.recipientMemberKey) ?? null,
            category: notification.category,
            severity: notification.severity,
            status: notification.status ?? NotificationStatus.UNREAD,
            title: notification.title,
            message: notification.message,
            entityType: notification.entityType ?? null,
            entityId: notification.entityId ?? null,
            metadata: jsonObject({ seeded: true, seedPack: blueprint.packKey }),
          }))
          .filter((notification): notification is NonNullable<typeof notification> =>
            Boolean(notification.recipientUserId),
          )
      : [];
  if (notificationRows.length > 0) {
    await prisma.notification.createMany({ data: notificationRows, skipDuplicates: true });
  }

  const domainEventRows =
    featureAvailability.domainEvents && blueprint.domainEvents
      ? blueprint.domainEvents.map((event) => ({
          id: deterministicPackUuid(blueprint.packNamespace, `domain-event:${event.key}`),
          organizationId,
          eventType: event.eventType,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          actorType: event.actorMemberKey ? 'USER' : null,
          actorId: event.actorMemberKey ? userIdByMemberKey.get(event.actorMemberKey) ?? null : null,
          sourceModule: event.sourceModule,
          payload: event.payload,
          metadata: event.metadata ?? jsonObject({ seeded: true, seedPack: blueprint.packKey }),
          triggeredByUserId: event.actorMemberKey
            ? userIdByMemberKey.get(event.actorMemberKey) ?? null
            : null,
        }))
      : [];
  if (domainEventRows.length > 0) {
    await prisma.domainEvent.createMany({ data: domainEventRows, skipDuplicates: true });
  }

  const enrichmentSummary: PackEnrichmentSummary = {
    modulesUsed: [],
    tenancy: {
      subscriptionPlans: 0,
      organizationSubscriptions: 0,
      organizationUsage: 0,
      organizationBillingEvents: 0,
    },
    connectors: {
      connectorDefinitions: 0,
      connectorInstances: 0,
      connectorCredentials: 0,
      connectorSyncJobs: 0,
      connectorActionLogs: 0,
    },
    observability: {
      systemAlerts: 0,
      healthCheckLogs: 0,
    },
    aiPlatform: {
      agentDefinitions: 0,
      agentPolicyRules: 0,
      agentRuns: 0,
      agentDecisions: 0,
      agentActionProposals: 0,
      agentVerificationResults: 0,
      decisionReports: 0,
      triggerRules: 0,
      triggerExecutionLogs: 0,
      actionExecutionLogs: 0,
    },
  };

  if (blueprint.enrichments?.tenancy && featureAvailability.tenancy) {
    enrichmentSummary.modulesUsed.push('tenancy');
    enrichmentSummary.tenancy = await seedBillingEnrichment(prisma, {
      packNamespace: blueprint.packNamespace,
      organizationId,
      profile: blueprint.enrichments.tenancy,
      now,
    });
  }

  if (blueprint.enrichments?.connectors && featureAvailability.connectors) {
    enrichmentSummary.modulesUsed.push('connectors');
    enrichmentSummary.connectors = await seedConnectorsEnrichment(prisma, {
      packNamespace: blueprint.packNamespace,
      organizationId,
      profile: blueprint.enrichments.connectors,
      now,
      creatorUserId: userRows[0]?.id ?? null,
      workOrderIds: workOrderRows.map((row) => row.id),
      incidentIds: incidentRows.map((row) => row.id),
      assetIds: assetRows.map((row) => row.id),
    });
  }

  if (blueprint.enrichments?.observability && featureAvailability.observability) {
    enrichmentSummary.modulesUsed.push('observability');
    enrichmentSummary.observability = await seedObservabilityEnrichment(prisma, {
      packNamespace: blueprint.packNamespace,
      organizationId,
      profile: blueprint.enrichments.observability,
      now,
    });
  }

  if (blueprint.enrichments?.aiPlatform && featureAvailability.aiPlatform) {
    enrichmentSummary.modulesUsed.push('aiPlatform');
    enrichmentSummary.aiPlatform = await seedAiPlatformEnrichment(prisma, {
      packNamespace: blueprint.packNamespace,
      organizationId,
      profile: blueprint.enrichments.aiPlatform,
      now,
      actorUserId: userRows[0]?.id ?? null,
      domainEventIds: domainEventRows.map((row) => row.id),
      approvalRequestIds:
        featureAvailability.workflows && workflowDefinitions.length > 0
          ? workflowDefinitions
              .filter((workflow) => workflow.approval)
              .map((workflow) =>
                deterministicPackUuid(blueprint.packNamespace, `approval-request:${workflow.key}`),
              )
          : [],
      workOrderIds: workOrderRows.map((row) => row.id),
      incidentIds: incidentRows.map((row) => row.id),
      notificationIds: notificationRows.map((row) => row.id),
    });
  }

  return {
    packKey: blueprint.packKey,
    organizationSlug: blueprint.organization.slug,
    organizations: 1,
    departments: blueprint.departments.length,
    positions: blueprint.positions.length,
    users: blueprint.team.length,
    employees: blueprint.team.length,
    workforce: featureAvailability.workforce ? blueprint.team.length : 0,
    workflowDefinitions: featureAvailability.workflows ? workflowDefinitions.length : 0,
    workflowInstances: featureAvailability.workflows ? workflowDefinitions.length : 0,
    workflowTasks: featureAvailability.workflows ? workflowDefinitions.length : 0,
    approvalRequests: featureAvailability.workflows
      ? workflowDefinitions.filter((workflow) => workflow.approval).length
      : 0,
    approvalSteps: featureAvailability.workflows
      ? workflowDefinitions.filter((workflow) => workflow.approval).length
      : 0,
    approvalDecisions: featureAvailability.workflows
      ? workflowDefinitions.filter((workflow) => workflow.approval?.step.decisionType).length
      : 0,
    workOrders: featureAvailability.workOrders ? blueprint.workOrders?.length ?? 0 : 0,
    assets: featureAvailability.assets ? blueprint.assets?.length ?? 0 : 0,
    incidents: featureAvailability.incidents ? blueprint.incidents?.length ?? 0 : 0,
    incidentActions: featureAvailability.incidents
      ? blueprint.incidents?.filter((incident) => incident.actionSummary).length ?? 0
      : 0,
    notifications: featureAvailability.notifications ? blueprint.notifications?.length ?? 0 : 0,
    domainEvents: featureAvailability.domainEvents ? blueprint.domainEvents?.length ?? 0 : 0,
    zones: featureAvailability.zones ? blueprint.zones?.length ?? 0 : 0,
    workforceProfileExtensions: profileExtensions,
    workforceAuthorizations: authorizations,
    enrichments: enrichmentSummary,
  };
};
