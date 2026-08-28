-- CreateEnum
CREATE TYPE "FleetVehicleClass" AS ENUM ('SEDAN', 'HATCHBACK', 'SUV', 'MICRO', 'EXECUTIVE', 'PREMIUM', 'VAN', 'OTHER');

-- CreateEnum
CREATE TYPE "FleetOnboardingStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FleetOperationalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'IN_SERVICE', 'OUT_OF_SERVICE', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "FleetComplianceStatus" AS ENUM ('PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'EXPIRED', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "FleetAssignmentStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'RESERVED', 'UNAVAILABLE', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "FleetMaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "FleetMaintenanceType" AS ENUM ('ROUTINE_SERVICE', 'OIL_CHANGE', 'TIRE_SERVICE', 'BRAKE_SERVICE', 'INSPECTION', 'REPAIR', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "FleetStatusCategory" AS ENUM ('ONBOARDING_STATUS', 'OPERATIONAL_STATUS', 'COMPLIANCE_STATUS', 'ASSIGNMENT_STATUS');

-- CreateTable
CREATE TABLE "fleet_vehicles" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "vehicleCode" VARCHAR(32) NOT NULL,
    "plateNumber" VARCHAR(40) NOT NULL,
    "vin" VARCHAR(80),
    "make" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "modelYear" INTEGER NOT NULL,
    "color" VARCHAR(40),
    "vehicleClass" "FleetVehicleClass" NOT NULL,
    "registrationNumber" VARCHAR(80),
    "registrationIssuedAt" DATE,
    "registrationExpiresAt" DATE,
    "insurancePolicyNumber" VARCHAR(80),
    "insuranceExpiresAt" DATE,
    "onboardingStatus" "FleetOnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "operationalStatus" "FleetOperationalStatus" NOT NULL DEFAULT 'INACTIVE',
    "complianceStatus" "FleetComplianceStatus" NOT NULL DEFAULT 'PENDING',
    "assignmentStatus" "FleetAssignmentStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "joinedAt" DATE NOT NULL,
    "decommissionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "fleet_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_maintenance_records" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "maintenanceType" "FleetMaintenanceType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "FleetMaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "vendorName" VARCHAR(160),
    "costAmount" DECIMAL(12,2),
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_status_history" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "statusCategory" "FleetStatusCategory" NOT NULL,
    "previousValue" VARCHAR(80),
    "newValue" VARCHAR(80) NOT NULL,
    "changedByUserId" UUID,
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fleet_vehicles_organizationId_vehicleClass_idx" ON "fleet_vehicles"("organizationId", "vehicleClass");

-- CreateIndex
CREATE INDEX "fleet_vehicles_organizationId_onboardingStatus_idx" ON "fleet_vehicles"("organizationId", "onboardingStatus");

-- CreateIndex
CREATE INDEX "fleet_vehicles_organizationId_operationalStatus_idx" ON "fleet_vehicles"("organizationId", "operationalStatus");

-- CreateIndex
CREATE INDEX "fleet_vehicles_organizationId_complianceStatus_idx" ON "fleet_vehicles"("organizationId", "complianceStatus");

-- CreateIndex
CREATE INDEX "fleet_vehicles_organizationId_assignmentStatus_idx" ON "fleet_vehicles"("organizationId", "assignmentStatus");

-- CreateIndex
CREATE INDEX "fleet_vehicles_deletedAt_idx" ON "fleet_vehicles"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_vehicles_organizationId_vehicleCode_key" ON "fleet_vehicles"("organizationId", "vehicleCode");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_vehicles_organizationId_plateNumber_key" ON "fleet_vehicles"("organizationId", "plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_vehicles_organizationId_vin_key" ON "fleet_vehicles"("organizationId", "vin");

-- CreateIndex
CREATE INDEX "fleet_maintenance_records_vehicleId_status_idx" ON "fleet_maintenance_records"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "fleet_maintenance_records_scheduledAt_status_idx" ON "fleet_maintenance_records"("scheduledAt", "status");

-- CreateIndex
CREATE INDEX "fleet_status_history_vehicleId_createdAt_idx" ON "fleet_status_history"("vehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "fleet_status_history_statusCategory_createdAt_idx" ON "fleet_status_history"("statusCategory", "createdAt");

-- CreateIndex
CREATE INDEX "fleet_status_history_changedByUserId_idx" ON "fleet_status_history"("changedByUserId");

-- AddForeignKey
ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_maintenance_records" ADD CONSTRAINT "fleet_maintenance_records_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fleet_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_status_history" ADD CONSTRAINT "fleet_status_history_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fleet_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_status_history" ADD CONSTRAINT "fleet_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
