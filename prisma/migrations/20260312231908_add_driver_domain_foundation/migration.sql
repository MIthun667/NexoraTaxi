-- CreateEnum
CREATE TYPE "DriverOnboardingStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DriverOperationalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'OFF_DUTY', 'BLOCKED');

-- CreateEnum
CREATE TYPE "DriverComplianceStatus" AS ENUM ('PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'EXPIRED', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "DriverAssignmentStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'UNAVAILABLE', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "DriverDocumentType" AS ENUM ('DRIVER_LICENSE', 'NATIONAL_ID', 'VEHICLE_PERMIT', 'BACKGROUND_CHECK', 'MEDICAL_CERTIFICATE', 'INSURANCE_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DriverStatusCategory" AS ENUM ('ONBOARDING_STATUS', 'OPERATIONAL_STATUS', 'COMPLIANCE_STATUS', 'ASSIGNMENT_STATUS');

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeId" UUID,
    "userId" UUID,
    "driverCode" VARCHAR(32) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "workEmail" VARCHAR(255),
    "phoneNumber" VARCHAR(30),
    "licenseNumber" VARCHAR(80) NOT NULL,
    "licenseIssuedAt" DATE,
    "licenseExpiresAt" DATE,
    "onboardingStatus" "DriverOnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "operationalStatus" "DriverOperationalStatus" NOT NULL DEFAULT 'INACTIVE',
    "complianceStatus" "DriverComplianceStatus" NOT NULL DEFAULT 'PENDING',
    "assignmentStatus" "DriverAssignmentStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "joinedAt" DATE NOT NULL,
    "suspendedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_documents" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "documentType" "DriverDocumentType" NOT NULL,
    "documentNumber" VARCHAR(100),
    "issuedAt" DATE,
    "expiresAt" DATE,
    "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_status_history" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "statusCategory" "DriverStatusCategory" NOT NULL,
    "previousValue" VARCHAR(80),
    "newValue" VARCHAR(80) NOT NULL,
    "changedByUserId" UUID,
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_employeeId_key" ON "drivers"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE INDEX "drivers_organizationId_onboardingStatus_idx" ON "drivers"("organizationId", "onboardingStatus");

-- CreateIndex
CREATE INDEX "drivers_organizationId_operationalStatus_idx" ON "drivers"("organizationId", "operationalStatus");

-- CreateIndex
CREATE INDEX "drivers_organizationId_complianceStatus_idx" ON "drivers"("organizationId", "complianceStatus");

-- CreateIndex
CREATE INDEX "drivers_organizationId_assignmentStatus_idx" ON "drivers"("organizationId", "assignmentStatus");

-- CreateIndex
CREATE INDEX "drivers_deletedAt_idx" ON "drivers"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_organizationId_driverCode_key" ON "drivers"("organizationId", "driverCode");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_organizationId_licenseNumber_key" ON "drivers"("organizationId", "licenseNumber");

-- CreateIndex
CREATE INDEX "driver_documents_driverId_documentType_idx" ON "driver_documents"("driverId", "documentType");

-- CreateIndex
CREATE INDEX "driver_documents_driverId_verificationStatus_idx" ON "driver_documents"("driverId", "verificationStatus");

-- CreateIndex
CREATE INDEX "driver_documents_expiresAt_idx" ON "driver_documents"("expiresAt");

-- CreateIndex
CREATE INDEX "driver_status_history_driverId_createdAt_idx" ON "driver_status_history"("driverId", "createdAt");

-- CreateIndex
CREATE INDEX "driver_status_history_statusCategory_createdAt_idx" ON "driver_status_history"("statusCategory", "createdAt");

-- CreateIndex
CREATE INDEX "driver_status_history_changedByUserId_idx" ON "driver_status_history"("changedByUserId");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_status_history" ADD CONSTRAINT "driver_status_history_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_status_history" ADD CONSTRAINT "driver_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
