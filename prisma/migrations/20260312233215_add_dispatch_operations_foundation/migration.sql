-- CreateEnum
CREATE TYPE "DispatchShiftStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DriverVehicleAssignmentStatus" AS ENUM ('ASSIGNED', 'ACTIVE', 'RELEASED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DispatchRunStatus" AS ENUM ('CREATED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "DispatchIncidentType" AS ENUM ('VEHICLE_BREAKDOWN', 'DRIVER_NO_SHOW', 'COMPLIANCE_ALERT', 'CUSTOMER_ESCALATION', 'ROUTE_DISRUPTION', 'SAFETY_EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DispatchIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DispatchIncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "dispatch_zones" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_shifts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "zoneId" UUID,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "DispatchShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "supervisorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "dispatch_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_vehicle_assignments" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "zoneId" UUID,
    "shiftId" UUID,
    "assignmentStatus" "DriverVehicleAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "assignedByUserId" UUID,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_vehicle_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_runs" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "zoneId" UUID,
    "runCode" VARCHAR(40) NOT NULL,
    "dispatchStatus" "DispatchRunStatus" NOT NULL DEFAULT 'CREATED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_incidents" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "runId" UUID,
    "assignmentId" UUID,
    "incidentCode" VARCHAR(40) NOT NULL,
    "incidentType" "DispatchIncidentType" NOT NULL,
    "severity" "DispatchIncidentSeverity" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "status" "DispatchIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "reportedByUserId" UUID,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dispatch_zones_organizationId_isActive_idx" ON "dispatch_zones"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "dispatch_zones_organizationId_name_idx" ON "dispatch_zones"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_zones_organizationId_code_key" ON "dispatch_zones"("organizationId", "code");

-- CreateIndex
CREATE INDEX "dispatch_shifts_organizationId_status_idx" ON "dispatch_shifts"("organizationId", "status");

-- CreateIndex
CREATE INDEX "dispatch_shifts_zoneId_status_idx" ON "dispatch_shifts"("zoneId", "status");

-- CreateIndex
CREATE INDEX "dispatch_shifts_deletedAt_idx" ON "dispatch_shifts"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_shifts_organizationId_code_key" ON "dispatch_shifts"("organizationId", "code");

-- CreateIndex
CREATE INDEX "driver_vehicle_assignments_organizationId_assignmentStatus_idx" ON "driver_vehicle_assignments"("organizationId", "assignmentStatus");

-- CreateIndex
CREATE INDEX "driver_vehicle_assignments_driverId_assignmentStatus_idx" ON "driver_vehicle_assignments"("driverId", "assignmentStatus");

-- CreateIndex
CREATE INDEX "driver_vehicle_assignments_vehicleId_assignmentStatus_idx" ON "driver_vehicle_assignments"("vehicleId", "assignmentStatus");

-- CreateIndex
CREATE INDEX "driver_vehicle_assignments_zoneId_assignmentStatus_idx" ON "driver_vehicle_assignments"("zoneId", "assignmentStatus");

-- CreateIndex
CREATE INDEX "driver_vehicle_assignments_shiftId_assignmentStatus_idx" ON "driver_vehicle_assignments"("shiftId", "assignmentStatus");

-- CreateIndex
CREATE INDEX "dispatch_runs_organizationId_dispatchStatus_idx" ON "dispatch_runs"("organizationId", "dispatchStatus");

-- CreateIndex
CREATE INDEX "dispatch_runs_assignmentId_dispatchStatus_idx" ON "dispatch_runs"("assignmentId", "dispatchStatus");

-- CreateIndex
CREATE INDEX "dispatch_runs_zoneId_dispatchStatus_idx" ON "dispatch_runs"("zoneId", "dispatchStatus");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_runs_organizationId_runCode_key" ON "dispatch_runs"("organizationId", "runCode");

-- CreateIndex
CREATE INDEX "dispatch_incidents_organizationId_status_idx" ON "dispatch_incidents"("organizationId", "status");

-- CreateIndex
CREATE INDEX "dispatch_incidents_runId_status_idx" ON "dispatch_incidents"("runId", "status");

-- CreateIndex
CREATE INDEX "dispatch_incidents_assignmentId_status_idx" ON "dispatch_incidents"("assignmentId", "status");

-- CreateIndex
CREATE INDEX "dispatch_incidents_severity_status_idx" ON "dispatch_incidents"("severity", "status");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_incidents_organizationId_incidentCode_key" ON "dispatch_incidents"("organizationId", "incidentCode");

-- AddForeignKey
ALTER TABLE "dispatch_zones" ADD CONSTRAINT "dispatch_zones_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_shifts" ADD CONSTRAINT "dispatch_shifts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_shifts" ADD CONSTRAINT "dispatch_shifts_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "dispatch_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_shifts" ADD CONSTRAINT "dispatch_shifts_supervisorUserId_fkey" FOREIGN KEY ("supervisorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vehicle_assignments" ADD CONSTRAINT "driver_vehicle_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vehicle_assignments" ADD CONSTRAINT "driver_vehicle_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vehicle_assignments" ADD CONSTRAINT "driver_vehicle_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fleet_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vehicle_assignments" ADD CONSTRAINT "driver_vehicle_assignments_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "dispatch_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vehicle_assignments" ADD CONSTRAINT "driver_vehicle_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "dispatch_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vehicle_assignments" ADD CONSTRAINT "driver_vehicle_assignments_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_runs" ADD CONSTRAINT "dispatch_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_runs" ADD CONSTRAINT "dispatch_runs_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "driver_vehicle_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_runs" ADD CONSTRAINT "dispatch_runs_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "dispatch_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_incidents" ADD CONSTRAINT "dispatch_incidents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_incidents" ADD CONSTRAINT "dispatch_incidents_runId_fkey" FOREIGN KEY ("runId") REFERENCES "dispatch_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_incidents" ADD CONSTRAINT "dispatch_incidents_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "driver_vehicle_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_incidents" ADD CONSTRAINT "dispatch_incidents_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
