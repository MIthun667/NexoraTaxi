DO $$
BEGIN
  CREATE TYPE "OrganizationLifecycleStatus" AS ENUM ('PROSPECT', 'TRIAL', 'ACTIVE_CUSTOMER', 'SUSPENDED', 'TERMINATED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "WorkforceMemberType" AS ENUM ('EMPLOYEE', 'CONTRACTOR', 'TEMPORARY', 'PARTNER', 'SERVICE_PROVIDER', 'ROBOTIC_OPERATOR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "WorkforceEmploymentModel" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'OUTSOURCED', 'PARTNER_MANAGED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "WorkforceOperationalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLOCKED', 'OFF_DUTY', 'ON_LEAVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "WorkforceComplianceStatus" AS ENUM ('PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'EXPIRED', 'UNDER_REVIEW');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "WorkforceAvailabilityStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'RESERVED', 'UNAVAILABLE', 'RESTRICTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CredentialDocumentType" AS ENUM ('LICENSE', 'CERTIFICATION', 'TRAINING_RECORD', 'BACKGROUND_CHECK', 'INSURANCE', 'PERMIT', 'IDENTITY_DOCUMENT', 'MEDICAL_CLEARANCE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CredentialVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "WorkforceStatusCategory" AS ENUM ('OPERATIONAL_STATUS', 'COMPLIANCE_STATUS', 'AVAILABILITY_STATUS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AssetType" AS ENUM ('VEHICLE', 'EQUIPMENT', 'DEVICE', 'FACILITY', 'ROOM', 'TOOL', 'ROBOT', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AssetOperationalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'IN_SERVICE', 'OUT_OF_SERVICE', 'BLOCKED', 'RETIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AssetComplianceStatus" AS ENUM ('PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'EXPIRED', 'UNDER_REVIEW');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AssetAvailabilityStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'RESERVED', 'UNAVAILABLE', 'RESTRICTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AssetMaintenanceType" AS ENUM ('INSPECTION', 'PREVENTIVE', 'REPAIR', 'CALIBRATION', 'CLEANING', 'REPLACEMENT', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AssetMaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AssetStatusCategory" AS ENUM ('OPERATIONAL_STATUS', 'COMPLIANCE_STATUS', 'AVAILABILITY_STATUS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "OperationalZoneType" AS ENUM ('GEOGRAPHIC', 'FACILITY', 'CAMPUS', 'REGION', 'TERRITORY', 'SERVICE_AREA', 'FUNCTIONAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "WorkOrderStatus" AS ENUM ('DRAFT', 'PLANNED', 'READY', 'ACTIVE', 'BLOCKED', 'COMPLETED', 'CANCELLED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "WorkOrderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SchedulePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FINALIZED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SchedulePlanType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CAMPAIGN', 'EVENT', 'ROLLING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ShiftType" AS ENUM ('OPERATIONS', 'FIELD_SERVICE', 'COVERAGE', 'ON_CALL', 'MAINTENANCE', 'SUPPORT', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ScheduleShiftStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "OperationalIncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "IncidentActionType" AS ENUM ('COMMENT', 'ESCALATE', 'REASSIGN', 'MITIGATE', 'RESOLVE', 'CLOSE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AssignmentType" AS ENUM ('WORKFORCE_TO_WORKORDER', 'ASSET_TO_WORKORDER', 'WORKFORCE_TO_ASSET', 'WORKFORCE_TO_SHIFT', 'ASSET_TO_SHIFT', 'COMPOSITE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ResourceAssignmentStatus" AS ENUM ('PLANNED', 'ASSIGNED', 'ACTIVE', 'RELEASED', 'CANCELLED', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "workforce_members" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "employeeId" UUID,
  "userId" UUID,
  "workerCode" VARCHAR(40) NOT NULL,
  "workerType" "WorkforceMemberType" NOT NULL,
  "employmentModel" "WorkforceEmploymentModel",
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  "displayName" VARCHAR(200),
  "workEmail" VARCHAR(255),
  "phoneNumber" VARCHAR(30),
  "operationalStatus" "WorkforceOperationalStatus" NOT NULL DEFAULT 'ACTIVE',
  "complianceStatus" "WorkforceComplianceStatus" NOT NULL DEFAULT 'PENDING',
  "availabilityStatus" "WorkforceAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
  "primaryDepartmentId" UUID,
  "primaryPositionId" UUID,
  "homeZoneId" UUID,
  "skills" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "workforce_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "credential_documents" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "workforceMemberId" UUID NOT NULL,
  "documentType" "CredentialDocumentType" NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "documentNumber" VARCHAR(120),
  "issuingAuthority" VARCHAR(160),
  "issuedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "verificationStatus" "CredentialVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedByUserId" UUID,
  "verifiedAt" TIMESTAMP(3),
  "storageUrl" VARCHAR(500),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "credential_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "workforce_status_history" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "workforceMemberId" UUID NOT NULL,
  "category" "WorkforceStatusCategory" NOT NULL,
  "previousValue" VARCHAR(80),
  "nextValue" VARCHAR(80) NOT NULL,
  "reason" VARCHAR(500),
  "changedByUserId" UUID,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workforce_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "operational_zones" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "zoneCode" VARCHAR(40) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "zoneType" "OperationalZoneType" NOT NULL,
  "description" VARCHAR(500),
  "parentZoneId" UUID,
  "coverageDefinition" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operational_zones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "assets" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "assetCode" VARCHAR(40) NOT NULL,
  "assetType" "AssetType" NOT NULL,
  "assetClass" VARCHAR(80),
  "name" VARCHAR(160) NOT NULL,
  "serialNumber" VARCHAR(120),
  "registrationNumber" VARCHAR(120),
  "operationalStatus" "AssetOperationalStatus" NOT NULL DEFAULT 'ACTIVE',
  "complianceStatus" "AssetComplianceStatus" NOT NULL DEFAULT 'PENDING',
  "availabilityStatus" "AssetAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
  "zoneId" UUID,
  "ownerOrganizationId" UUID,
  "specifications" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "asset_maintenance_records" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "assetId" UUID NOT NULL,
  "maintenanceType" "AssetMaintenanceType" NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "status" "AssetMaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
  "priority" "WorkOrderPriority" NOT NULL DEFAULT 'MEDIUM',
  "scheduledAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "performedByWorkforceMemberId" UUID,
  "vendorName" VARCHAR(160),
  "costAmount" DECIMAL(12,2),
  "currencyCode" VARCHAR(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "asset_maintenance_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "asset_status_history" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "assetId" UUID NOT NULL,
  "category" "AssetStatusCategory" NOT NULL,
  "previousValue" VARCHAR(80),
  "nextValue" VARCHAR(80) NOT NULL,
  "reason" VARCHAR(500),
  "changedByUserId" UUID,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "asset_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "work_orders" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "workOrderCode" VARCHAR(40) NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "workType" VARCHAR(80) NOT NULL,
  "status" "WorkOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "priority" "WorkOrderPriority" NOT NULL DEFAULT 'MEDIUM',
  "zoneId" UUID,
  "createdByUserId" UUID,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduledStartAt" TIMESTAMP(3),
  "scheduledEndAt" TIMESTAMP(3),
  "actualStartAt" TIMESTAMP(3),
  "actualEndAt" TIMESTAMP(3),
  "sourceType" VARCHAR(80),
  "sourceId" VARCHAR(100),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "schedule_plans" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "planType" "SchedulePlanType" NOT NULL,
  "status" "SchedulePlanStatus" NOT NULL DEFAULT 'DRAFT',
  "planningWindowStart" TIMESTAMP(3) NOT NULL,
  "planningWindowEnd" TIMESTAMP(3) NOT NULL,
  "ownerUserId" UUID,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "schedule_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "schedule_shifts" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "schedulePlanId" UUID,
  "shiftCode" VARCHAR(40) NOT NULL,
  "shiftType" "ShiftType" NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "status" "ScheduleShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
  "zoneId" UUID,
  "ownerUserId" UUID,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "capacityRequired" INTEGER,
  "capacityAllocated" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "schedule_shifts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "operational_incidents" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "incidentCode" VARCHAR(40) NOT NULL,
  "incidentType" VARCHAR(80) NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "severity" "IncidentSeverity" NOT NULL,
  "status" "OperationalIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "zoneId" UUID,
  "workOrderId" UUID,
  "workforceMemberId" UUID,
  "assetId" UUID,
  "relatedEntityType" VARCHAR(80),
  "relatedEntityId" VARCHAR(100),
  "reportedByUserId" UUID,
  "assignedToUserId" UUID,
  "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operational_incidents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "incident_actions" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "incidentId" UUID NOT NULL,
  "actionType" "IncidentActionType" NOT NULL,
  "summary" VARCHAR(500) NOT NULL,
  "performedByUserId" UUID,
  "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "incident_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "resource_assignments" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "assignmentType" "AssignmentType" NOT NULL,
  "status" "ResourceAssignmentStatus" NOT NULL DEFAULT 'PLANNED',
  "workforceMemberId" UUID,
  "assetId" UUID,
  "shiftId" UUID,
  "workOrderId" UUID,
  "zoneId" UUID,
  "assignedByUserId" UUID,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resource_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workforce_members_employeeId_key" ON "workforce_members"("employeeId");
CREATE UNIQUE INDEX IF NOT EXISTS "workforce_members_userId_key" ON "workforce_members"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "workforce_members_organizationId_workerCode_key" ON "workforce_members"("organizationId", "workerCode");
CREATE INDEX IF NOT EXISTS "workforce_members_organizationId_workerType_operationalStatus_idx" ON "workforce_members"("organizationId", "workerType", "operationalStatus");
CREATE INDEX IF NOT EXISTS "workforce_members_organizationId_availabilityStatus_complianceSt_idx" ON "workforce_members"("organizationId", "availabilityStatus", "complianceStatus");
CREATE INDEX IF NOT EXISTS "workforce_members_primaryDepartmentId_idx" ON "workforce_members"("primaryDepartmentId");
CREATE INDEX IF NOT EXISTS "workforce_members_primaryPositionId_idx" ON "workforce_members"("primaryPositionId");
CREATE INDEX IF NOT EXISTS "workforce_members_homeZoneId_idx" ON "workforce_members"("homeZoneId");
CREATE INDEX IF NOT EXISTS "workforce_members_deletedAt_idx" ON "workforce_members"("deletedAt");

CREATE INDEX IF NOT EXISTS "credential_documents_organizationId_documentType_verificationSta_idx" ON "credential_documents"("organizationId", "documentType", "verificationStatus");
CREATE INDEX IF NOT EXISTS "credential_documents_workforceMemberId_verificationStatus_exp_idx" ON "credential_documents"("workforceMemberId", "verificationStatus", "expiresAt");
CREATE INDEX IF NOT EXISTS "credential_documents_verifiedByUserId_idx" ON "credential_documents"("verifiedByUserId");
CREATE INDEX IF NOT EXISTS "credential_documents_expiresAt_idx" ON "credential_documents"("expiresAt");

CREATE INDEX IF NOT EXISTS "workforce_status_history_organizationId_category_effectiveAt_idx" ON "workforce_status_history"("organizationId", "category", "effectiveAt");
CREATE INDEX IF NOT EXISTS "workforce_status_history_workforceMemberId_effectiveAt_idx" ON "workforce_status_history"("workforceMemberId", "effectiveAt");
CREATE INDEX IF NOT EXISTS "workforce_status_history_changedByUserId_effectiveAt_idx" ON "workforce_status_history"("changedByUserId", "effectiveAt");

CREATE UNIQUE INDEX IF NOT EXISTS "operational_zones_organizationId_zoneCode_key" ON "operational_zones"("organizationId", "zoneCode");
CREATE INDEX IF NOT EXISTS "operational_zones_organizationId_zoneType_isActive_idx" ON "operational_zones"("organizationId", "zoneType", "isActive");
CREATE INDEX IF NOT EXISTS "operational_zones_parentZoneId_idx" ON "operational_zones"("parentZoneId");

CREATE UNIQUE INDEX IF NOT EXISTS "assets_organizationId_assetCode_key" ON "assets"("organizationId", "assetCode");
CREATE INDEX IF NOT EXISTS "assets_organizationId_assetType_operationalStatus_idx" ON "assets"("organizationId", "assetType", "operationalStatus");
CREATE INDEX IF NOT EXISTS "assets_organizationId_availabilityStatus_complianceStatus_idx" ON "assets"("organizationId", "availabilityStatus", "complianceStatus");
CREATE INDEX IF NOT EXISTS "assets_zoneId_idx" ON "assets"("zoneId");
CREATE INDEX IF NOT EXISTS "assets_ownerOrganizationId_idx" ON "assets"("ownerOrganizationId");
CREATE INDEX IF NOT EXISTS "assets_deletedAt_idx" ON "assets"("deletedAt");

CREATE INDEX IF NOT EXISTS "asset_maintenance_records_organizationId_status_scheduledAt_idx" ON "asset_maintenance_records"("organizationId", "status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "asset_maintenance_records_assetId_status_scheduledAt_idx" ON "asset_maintenance_records"("assetId", "status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "asset_maintenance_records_performedByWorkforceMemberId_idx" ON "asset_maintenance_records"("performedByWorkforceMemberId");

CREATE INDEX IF NOT EXISTS "asset_status_history_organizationId_category_effectiveAt_idx" ON "asset_status_history"("organizationId", "category", "effectiveAt");
CREATE INDEX IF NOT EXISTS "asset_status_history_assetId_effectiveAt_idx" ON "asset_status_history"("assetId", "effectiveAt");
CREATE INDEX IF NOT EXISTS "asset_status_history_changedByUserId_effectiveAt_idx" ON "asset_status_history"("changedByUserId", "effectiveAt");

CREATE UNIQUE INDEX IF NOT EXISTS "work_orders_organizationId_workOrderCode_key" ON "work_orders"("organizationId", "workOrderCode");
CREATE INDEX IF NOT EXISTS "work_orders_organizationId_status_priority_idx" ON "work_orders"("organizationId", "status", "priority");
CREATE INDEX IF NOT EXISTS "work_orders_organizationId_zoneId_status_idx" ON "work_orders"("organizationId", "zoneId", "status");
CREATE INDEX IF NOT EXISTS "work_orders_scheduledStartAt_scheduledEndAt_idx" ON "work_orders"("scheduledStartAt", "scheduledEndAt");
CREATE INDEX IF NOT EXISTS "work_orders_sourceType_sourceId_idx" ON "work_orders"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "work_orders_createdByUserId_idx" ON "work_orders"("createdByUserId");

CREATE INDEX IF NOT EXISTS "schedule_plans_organizationId_status_planningWindowStart_idx" ON "schedule_plans"("organizationId", "status", "planningWindowStart");
CREATE INDEX IF NOT EXISTS "schedule_plans_ownerUserId_idx" ON "schedule_plans"("ownerUserId");

CREATE UNIQUE INDEX IF NOT EXISTS "schedule_shifts_organizationId_shiftCode_key" ON "schedule_shifts"("organizationId", "shiftCode");
CREATE INDEX IF NOT EXISTS "schedule_shifts_organizationId_status_startsAt_idx" ON "schedule_shifts"("organizationId", "status", "startsAt");
CREATE INDEX IF NOT EXISTS "schedule_shifts_organizationId_zoneId_startsAt_idx" ON "schedule_shifts"("organizationId", "zoneId", "startsAt");
CREATE INDEX IF NOT EXISTS "schedule_shifts_schedulePlanId_idx" ON "schedule_shifts"("schedulePlanId");
CREATE INDEX IF NOT EXISTS "schedule_shifts_ownerUserId_idx" ON "schedule_shifts"("ownerUserId");

CREATE UNIQUE INDEX IF NOT EXISTS "operational_incidents_organizationId_incidentCode_key" ON "operational_incidents"("organizationId", "incidentCode");
CREATE INDEX IF NOT EXISTS "operational_incidents_organizationId_status_severity_reportedAt_idx" ON "operational_incidents"("organizationId", "status", "severity", "reportedAt");
CREATE INDEX IF NOT EXISTS "operational_incidents_zoneId_status_reportedAt_idx" ON "operational_incidents"("zoneId", "status", "reportedAt");
CREATE INDEX IF NOT EXISTS "operational_incidents_workOrderId_idx" ON "operational_incidents"("workOrderId");
CREATE INDEX IF NOT EXISTS "operational_incidents_workforceMemberId_idx" ON "operational_incidents"("workforceMemberId");
CREATE INDEX IF NOT EXISTS "operational_incidents_assetId_idx" ON "operational_incidents"("assetId");
CREATE INDEX IF NOT EXISTS "operational_incidents_relatedEntityType_relatedEntityId_idx" ON "operational_incidents"("relatedEntityType", "relatedEntityId");
CREATE INDEX IF NOT EXISTS "operational_incidents_assignedToUserId_status_idx" ON "operational_incidents"("assignedToUserId", "status");

CREATE INDEX IF NOT EXISTS "incident_actions_organizationId_actionType_performedAt_idx" ON "incident_actions"("organizationId", "actionType", "performedAt");
CREATE INDEX IF NOT EXISTS "incident_actions_incidentId_performedAt_idx" ON "incident_actions"("incidentId", "performedAt");
CREATE INDEX IF NOT EXISTS "incident_actions_performedByUserId_idx" ON "incident_actions"("performedByUserId");

CREATE INDEX IF NOT EXISTS "resource_assignments_organizationId_status_assignedAt_idx" ON "resource_assignments"("organizationId", "status", "assignedAt");
CREATE INDEX IF NOT EXISTS "resource_assignments_organizationId_assignmentType_status_idx" ON "resource_assignments"("organizationId", "assignmentType", "status");
CREATE INDEX IF NOT EXISTS "resource_assignments_workforceMemberId_status_idx" ON "resource_assignments"("workforceMemberId", "status");
CREATE INDEX IF NOT EXISTS "resource_assignments_assetId_status_idx" ON "resource_assignments"("assetId", "status");
CREATE INDEX IF NOT EXISTS "resource_assignments_shiftId_status_idx" ON "resource_assignments"("shiftId", "status");
CREATE INDEX IF NOT EXISTS "resource_assignments_workOrderId_status_idx" ON "resource_assignments"("workOrderId", "status");
CREATE INDEX IF NOT EXISTS "resource_assignments_zoneId_status_idx" ON "resource_assignments"("zoneId", "status");
CREATE INDEX IF NOT EXISTS "resource_assignments_assignedByUserId_idx" ON "resource_assignments"("assignedByUserId");

DO $$
BEGIN
  ALTER TABLE "organizations"
    ADD COLUMN IF NOT EXISTS "lifecycleStatus" "OrganizationLifecycleStatus" NOT NULL DEFAULT 'PROSPECT';
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "organizations_lifecycleStatus_idx" ON "organizations"("lifecycleStatus");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workforce_members_organizationId_fkey') THEN
    ALTER TABLE "workforce_members" ADD CONSTRAINT "workforce_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workforce_members_employeeId_fkey') THEN
    ALTER TABLE "workforce_members" ADD CONSTRAINT "workforce_members_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workforce_members_userId_fkey') THEN
    ALTER TABLE "workforce_members" ADD CONSTRAINT "workforce_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workforce_members_primaryDepartmentId_fkey') THEN
    ALTER TABLE "workforce_members" ADD CONSTRAINT "workforce_members_primaryDepartmentId_fkey" FOREIGN KEY ("primaryDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workforce_members_primaryPositionId_fkey') THEN
    ALTER TABLE "workforce_members" ADD CONSTRAINT "workforce_members_primaryPositionId_fkey" FOREIGN KEY ("primaryPositionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workforce_members_homeZoneId_fkey') THEN
    ALTER TABLE "workforce_members" ADD CONSTRAINT "workforce_members_homeZoneId_fkey" FOREIGN KEY ("homeZoneId") REFERENCES "operational_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credential_documents_organizationId_fkey') THEN
    ALTER TABLE "credential_documents" ADD CONSTRAINT "credential_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credential_documents_workforceMemberId_fkey') THEN
    ALTER TABLE "credential_documents" ADD CONSTRAINT "credential_documents_workforceMemberId_fkey" FOREIGN KEY ("workforceMemberId") REFERENCES "workforce_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credential_documents_verifiedByUserId_fkey') THEN
    ALTER TABLE "credential_documents" ADD CONSTRAINT "credential_documents_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workforce_status_history_organizationId_fkey') THEN
    ALTER TABLE "workforce_status_history" ADD CONSTRAINT "workforce_status_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workforce_status_history_workforceMemberId_fkey') THEN
    ALTER TABLE "workforce_status_history" ADD CONSTRAINT "workforce_status_history_workforceMemberId_fkey" FOREIGN KEY ("workforceMemberId") REFERENCES "workforce_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workforce_status_history_changedByUserId_fkey') THEN
    ALTER TABLE "workforce_status_history" ADD CONSTRAINT "workforce_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operational_zones_organizationId_fkey') THEN
    ALTER TABLE "operational_zones" ADD CONSTRAINT "operational_zones_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operational_zones_parentZoneId_fkey') THEN
    ALTER TABLE "operational_zones" ADD CONSTRAINT "operational_zones_parentZoneId_fkey" FOREIGN KEY ("parentZoneId") REFERENCES "operational_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_organizationId_fkey') THEN
    ALTER TABLE "assets" ADD CONSTRAINT "assets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_zoneId_fkey') THEN
    ALTER TABLE "assets" ADD CONSTRAINT "assets_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "operational_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_ownerOrganizationId_fkey') THEN
    ALTER TABLE "assets" ADD CONSTRAINT "assets_ownerOrganizationId_fkey" FOREIGN KEY ("ownerOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'asset_maintenance_records_organizationId_fkey') THEN
    ALTER TABLE "asset_maintenance_records" ADD CONSTRAINT "asset_maintenance_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'asset_maintenance_records_assetId_fkey') THEN
    ALTER TABLE "asset_maintenance_records" ADD CONSTRAINT "asset_maintenance_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'asset_maintenance_records_performedByWorkforceMemberId_fkey') THEN
    ALTER TABLE "asset_maintenance_records" ADD CONSTRAINT "asset_maintenance_records_performedByWorkforceMemberId_fkey" FOREIGN KEY ("performedByWorkforceMemberId") REFERENCES "workforce_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'asset_status_history_organizationId_fkey') THEN
    ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'asset_status_history_assetId_fkey') THEN
    ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'asset_status_history_changedByUserId_fkey') THEN
    ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_organizationId_fkey') THEN
    ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_zoneId_fkey') THEN
    ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "operational_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_createdByUserId_fkey') THEN
    ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_plans_organizationId_fkey') THEN
    ALTER TABLE "schedule_plans" ADD CONSTRAINT "schedule_plans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_plans_ownerUserId_fkey') THEN
    ALTER TABLE "schedule_plans" ADD CONSTRAINT "schedule_plans_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_shifts_organizationId_fkey') THEN
    ALTER TABLE "schedule_shifts" ADD CONSTRAINT "schedule_shifts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_shifts_schedulePlanId_fkey') THEN
    ALTER TABLE "schedule_shifts" ADD CONSTRAINT "schedule_shifts_schedulePlanId_fkey" FOREIGN KEY ("schedulePlanId") REFERENCES "schedule_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_shifts_zoneId_fkey') THEN
    ALTER TABLE "schedule_shifts" ADD CONSTRAINT "schedule_shifts_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "operational_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_shifts_ownerUserId_fkey') THEN
    ALTER TABLE "schedule_shifts" ADD CONSTRAINT "schedule_shifts_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operational_incidents_organizationId_fkey') THEN
    ALTER TABLE "operational_incidents" ADD CONSTRAINT "operational_incidents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operational_incidents_zoneId_fkey') THEN
    ALTER TABLE "operational_incidents" ADD CONSTRAINT "operational_incidents_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "operational_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operational_incidents_workOrderId_fkey') THEN
    ALTER TABLE "operational_incidents" ADD CONSTRAINT "operational_incidents_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operational_incidents_workforceMemberId_fkey') THEN
    ALTER TABLE "operational_incidents" ADD CONSTRAINT "operational_incidents_workforceMemberId_fkey" FOREIGN KEY ("workforceMemberId") REFERENCES "workforce_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operational_incidents_assetId_fkey') THEN
    ALTER TABLE "operational_incidents" ADD CONSTRAINT "operational_incidents_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operational_incidents_reportedByUserId_fkey') THEN
    ALTER TABLE "operational_incidents" ADD CONSTRAINT "operational_incidents_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operational_incidents_assignedToUserId_fkey') THEN
    ALTER TABLE "operational_incidents" ADD CONSTRAINT "operational_incidents_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'incident_actions_organizationId_fkey') THEN
    ALTER TABLE "incident_actions" ADD CONSTRAINT "incident_actions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'incident_actions_incidentId_fkey') THEN
    ALTER TABLE "incident_actions" ADD CONSTRAINT "incident_actions_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "operational_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'incident_actions_performedByUserId_fkey') THEN
    ALTER TABLE "incident_actions" ADD CONSTRAINT "incident_actions_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resource_assignments_organizationId_fkey') THEN
    ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resource_assignments_workforceMemberId_fkey') THEN
    ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_workforceMemberId_fkey" FOREIGN KEY ("workforceMemberId") REFERENCES "workforce_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resource_assignments_assetId_fkey') THEN
    ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resource_assignments_shiftId_fkey') THEN
    ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "schedule_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resource_assignments_workOrderId_fkey') THEN
    ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resource_assignments_zoneId_fkey') THEN
    ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "operational_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resource_assignments_assignedByUserId_fkey') THEN
    ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
