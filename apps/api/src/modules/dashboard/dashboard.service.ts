import {
  ApprovalRequestStatus,
  ApprovalStepStatus,
  DispatchIncidentSeverity,
  DispatchIncidentStatus,
  DispatchRunStatus,
  DriverAssignmentStatus,
  DriverComplianceStatus,
  DriverOnboardingStatus,
  DriverOperationalStatus,
  EmploymentStatus,
  FleetAssignmentStatus,
  FleetComplianceStatus,
  FleetMaintenanceStatus,
  FleetOnboardingStatus,
  FleetOperationalStatus,
  Prisma,
  WorkflowInstanceStatus,
  WorkflowTaskStatus,
} from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { QueryDashboardAlertsDto } from './dto/query-dashboard-alerts.dto';
import { QueryDashboardOverviewDto } from './dto/query-dashboard-overview.dto';
import { QueryDashboardTrendDto } from './dto/query-dashboard-trend.dto';

type SummaryQueryDto = QueryDashboardOverviewDto | QueryDashboardAlertsDto | QueryDashboardTrendDto;

type CountByValue = {
  value: string;
  count: number;
};

type TrendPoint = {
  date: string;
  count: number;
};

type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type OperationalAlert = {
  id: string;
  category: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

// TODO(universal-signals): converge dashboard alert and trend read models onto the shared CanonicalSignal contract in common/signals once dashboard consumers are ready.
// TODO(agent-insights): promote dashboard alert cards and summary blocks to AgentInsight-compatible read models after signal-backed insight bundling is introduced.
// TODO(recommendations): represent operator-facing next-step guidance through the shared Recommendation contract once dashboards adopt insight bundles.
//
// Contributor guidance:
// - Treat workforce/operators, assets, and operations as the canonical dashboard domains.
// - `drivers`, `fleet`, and `dispatch` remain compatibility-backed data sources until the
//   underlying legacy persistence and summary contracts are retired.

const ACTIVE_DRIVER_STATUSES: DriverOperationalStatus[] = [DriverOperationalStatus.ACTIVE];
const AVAILABLE_DRIVER_STATUSES: DriverAssignmentStatus[] = [DriverAssignmentStatus.AVAILABLE];
const READY_DRIVER_ONBOARDING_STATUSES: DriverOnboardingStatus[] = [
  DriverOnboardingStatus.APPROVED,
  DriverOnboardingStatus.COMPLETED,
];
const READY_DRIVER_COMPLIANCE_STATUSES: DriverComplianceStatus[] = [
  DriverComplianceStatus.COMPLIANT,
];

const ACTIVE_FLEET_STATUSES: FleetOperationalStatus[] = [
  FleetOperationalStatus.ACTIVE,
  FleetOperationalStatus.IN_SERVICE,
];
const AVAILABLE_FLEET_STATUSES: FleetAssignmentStatus[] = [FleetAssignmentStatus.AVAILABLE];
const READY_FLEET_ONBOARDING_STATUSES: FleetOnboardingStatus[] = [
  FleetOnboardingStatus.APPROVED,
  FleetOnboardingStatus.COMPLETED,
];
const READY_FLEET_COMPLIANCE_STATUSES: FleetComplianceStatus[] = [
  FleetComplianceStatus.COMPLIANT,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  async getOverview(principal: CurrentPrincipal, query: QueryDashboardOverviewDto) {
    const organizationId = await this.resolveOrganizationScope(principal, query);
    const [workforce, drivers, fleet, dispatch, approvals, workflows] = await Promise.all([
      this.getWorkforceOverviewMetrics(organizationId),
      this.getDriversOverviewMetrics(organizationId),
      this.getFleetOverviewMetrics(organizationId),
      this.getDispatchOverviewMetrics(organizationId),
      this.getApprovalOverviewMetrics(organizationId),
      this.getWorkflowOverviewMetrics(organizationId),
    ]);

    return buildSuccessResponse('Operational overview retrieved successfully.', {
      organizationId,
      generatedAt: new Date().toISOString(),
      workforce,
      drivers,
      fleet,
      dispatch,
      approvals,
      workflows,
    });
  }

  async getWorkforceSummary(principal: CurrentPrincipal, query: QueryDashboardOverviewDto) {
    const organizationId = await this.resolveOrganizationScope(principal, query);
    const [totalEmployees, activeEmployees, onboardingEmployees, probationEmployees, leaveOfAbsenceEmployees, recentlyHiredCount, byStatus, departmentCounts] =
      await Promise.all([
        this.prismaService.employee.count({
          where: { organizationId, deletedAt: null },
        }),
        this.prismaService.employee.count({
          where: {
            organizationId,
            deletedAt: null,
            employmentStatus: EmploymentStatus.ACTIVE,
          },
        }),
        this.prismaService.employee.count({
          where: {
            organizationId,
            deletedAt: null,
            employmentStatus: EmploymentStatus.ONBOARDING,
          },
        }),
        this.prismaService.employee.count({
          where: {
            organizationId,
            deletedAt: null,
            employmentStatus: EmploymentStatus.PROBATION,
          },
        }),
        this.prismaService.employee.count({
          where: {
            organizationId,
            deletedAt: null,
            employmentStatus: EmploymentStatus.LEAVE_OF_ABSENCE,
          },
        }),
        this.prismaService.employee.count({
          where: {
            organizationId,
            deletedAt: null,
            hireDate: { gte: this.daysAgo(30) },
          },
        }),
        this.prismaService.employee.groupBy({
          by: ['employmentStatus'],
          where: { organizationId, deletedAt: null },
          _count: { _all: true },
        }),
        this.prismaService.employee.groupBy({
          by: ['departmentId'],
          where: { organizationId, deletedAt: null },
          _count: { _all: true },
        }),
      ]);

    const departmentIds = departmentCounts
      .map((department) => department.departmentId)
      .filter((departmentId): departmentId is string => Boolean(departmentId));

    const departments = departmentIds.length
      ? await this.prismaService.department.findMany({
          where: { id: { in: departmentIds } },
          select: { id: true, name: true, code: true },
        })
      : [];

    const departmentMap = new Map(departments.map((department) => [department.id, department]));

    return buildSuccessResponse('Workforce summary retrieved successfully.', {
      organizationId,
      generatedAt: new Date().toISOString(),
      totals: {
        totalEmployees,
        activeEmployees,
        onboardingEmployees,
        probationEmployees,
        leaveOfAbsenceEmployees,
        recentlyHiredCount,
      },
      byEmploymentStatus: byStatus.map((entry) => ({
        status: entry.employmentStatus,
        count: entry._count._all,
      })),
      byDepartment: departmentCounts.map((entry) => ({
        departmentId: entry.departmentId,
        departmentName: entry.departmentId ? departmentMap.get(entry.departmentId)?.name ?? null : null,
        departmentCode: entry.departmentId ? departmentMap.get(entry.departmentId)?.code ?? null : null,
        count: entry._count._all,
      })),
    });
  }

  async getDriversSummary(principal: CurrentPrincipal, query: QueryDashboardOverviewDto) {
    const organizationId = await this.resolveOrganizationScope(principal, query);
    const [totalDrivers, activeDrivers, availableDrivers, suspendedDrivers, nonCompliantDrivers, onboardingPendingDrivers, dispatchEligibleDrivers, byOperationalStatus, byComplianceStatus] =
      await Promise.all([
        this.prismaService.driver.count({ where: { organizationId, deletedAt: null } }),
        this.prismaService.driver.count({
          where: {
            organizationId,
            deletedAt: null,
            operationalStatus: DriverOperationalStatus.ACTIVE,
          },
        }),
        this.prismaService.driver.count({
          where: {
            organizationId,
            deletedAt: null,
            assignmentStatus: DriverAssignmentStatus.AVAILABLE,
          },
        }),
        this.prismaService.driver.count({
          where: {
            organizationId,
            deletedAt: null,
            operationalStatus: DriverOperationalStatus.SUSPENDED,
          },
        }),
        this.prismaService.driver.count({
          where: {
            organizationId,
            deletedAt: null,
            complianceStatus: { in: [DriverComplianceStatus.NON_COMPLIANT, DriverComplianceStatus.EXPIRED] },
          },
        }),
        this.prismaService.driver.count({
          where: {
            organizationId,
            deletedAt: null,
            onboardingStatus: DriverOnboardingStatus.PENDING,
          },
        }),
        this.prismaService.driver.count({
          where: this.buildDispatchEligibleDriverWhere(organizationId),
        }),
        this.prismaService.driver.groupBy({
          by: ['operationalStatus'],
          where: { organizationId, deletedAt: null },
          _count: { _all: true },
        }),
        this.prismaService.driver.groupBy({
          by: ['complianceStatus'],
          where: { organizationId, deletedAt: null },
          _count: { _all: true },
        }),
      ]);

    return buildSuccessResponse('Operator operations summary retrieved successfully.', {
      organizationId,
      generatedAt: new Date().toISOString(),
      totals: {
        totalDrivers,
        activeDrivers,
        availableDrivers,
        suspendedDrivers,
        nonCompliantDrivers,
        onboardingPendingDrivers,
        dispatchEligibleDrivers,
      },
      byOperationalStatus: byOperationalStatus.map((entry) => ({
        status: entry.operationalStatus,
        count: entry._count._all,
      })),
      byComplianceStatus: byComplianceStatus.map((entry) => ({
        status: entry.complianceStatus,
        count: entry._count._all,
      })),
    });
  }

  async getFleetSummary(principal: CurrentPrincipal, query: QueryDashboardOverviewDto) {
    const organizationId = await this.resolveOrganizationScope(principal, query);
    const complianceWindowEnd = this.daysFromNow(30);
    const now = new Date();

    const [totalVehicles, activeVehicles, availableVehicles, outOfServiceVehicles, nonCompliantVehicles, dispatchReadyVehicles, expiringComplianceArtifacts, overdueMaintenanceCount, byClass] =
      await Promise.all([
        this.prismaService.fleetVehicle.count({ where: { organizationId, deletedAt: null } }),
        this.prismaService.fleetVehicle.count({
          where: {
            organizationId,
            deletedAt: null,
            operationalStatus: { in: ACTIVE_FLEET_STATUSES },
          },
        }),
        this.prismaService.fleetVehicle.count({
          where: {
            organizationId,
            deletedAt: null,
            assignmentStatus: FleetAssignmentStatus.AVAILABLE,
          },
        }),
        this.prismaService.fleetVehicle.count({
          where: {
            organizationId,
            deletedAt: null,
            operationalStatus: FleetOperationalStatus.OUT_OF_SERVICE,
          },
        }),
        this.prismaService.fleetVehicle.count({
          where: {
            organizationId,
            deletedAt: null,
            complianceStatus: { in: [FleetComplianceStatus.NON_COMPLIANT, FleetComplianceStatus.EXPIRED] },
          },
        }),
        this.prismaService.fleetVehicle.count({
          where: this.buildDispatchReadyVehicleWhere(organizationId),
        }),
        this.prismaService.fleetVehicle.count({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              {
                registrationExpiresAt: {
                  gte: now,
                  lte: complianceWindowEnd,
                },
              },
              {
                insuranceExpiresAt: {
                  gte: now,
                  lte: complianceWindowEnd,
                },
              },
            ],
          },
        }),
        this.prismaService.fleetMaintenanceRecord.count({
          where: {
            vehicle: { organizationId, deletedAt: null },
            OR: [
              { status: FleetMaintenanceStatus.OVERDUE },
              {
                scheduledAt: { lt: now },
                status: { in: [FleetMaintenanceStatus.SCHEDULED, FleetMaintenanceStatus.IN_PROGRESS] },
              },
            ],
          },
        }),
        this.prismaService.fleetVehicle.groupBy({
          by: ['vehicleClass'],
          where: { organizationId, deletedAt: null },
          _count: { _all: true },
        }),
      ]);

    return buildSuccessResponse('Asset operations summary retrieved successfully.', {
      organizationId,
      generatedAt: new Date().toISOString(),
      totals: {
        totalVehicles,
        activeVehicles,
        availableVehicles,
        outOfServiceVehicles,
        nonCompliantVehicles,
        dispatchReadyVehicles,
        expiringComplianceArtifacts,
        overdueMaintenanceCount,
      },
      byVehicleClass: byClass.map((entry) => ({
        vehicleClass: entry.vehicleClass,
        count: entry._count._all,
      })),
    });
  }

  async getDispatchSummary(principal: CurrentPrincipal, query: QueryDashboardOverviewDto) {
    const organizationId = await this.resolveOrganizationScope(principal, query);
    const todayStart = this.startOfDay(new Date());
    const now = new Date();

    const [activeAssignments, activeRuns, releasedAssignmentsToday, openIncidents, incidentsBySeverity, assignmentsByZone, runsByStatus, activeShiftsToday] =
      await Promise.all([
        this.prismaService.driverVehicleAssignment.count({
          where: {
            organizationId,
            assignmentStatus: { in: ['ASSIGNED', 'ACTIVE'] },
          },
        }),
        this.prismaService.dispatchRun.count({
          where: {
            organizationId,
            dispatchStatus: DispatchRunStatus.ACTIVE,
          },
        }),
        this.prismaService.driverVehicleAssignment.count({
          where: {
            organizationId,
            releasedAt: { gte: todayStart },
          },
        }),
        this.prismaService.dispatchIncident.count({
          where: {
            organizationId,
            status: { in: [DispatchIncidentStatus.OPEN, DispatchIncidentStatus.IN_PROGRESS] },
          },
        }),
        this.prismaService.dispatchIncident.groupBy({
          by: ['severity'],
          where: { organizationId },
          _count: { _all: true },
        }),
        this.prismaService.driverVehicleAssignment.groupBy({
          by: ['zoneId'],
          where: {
            organizationId,
            assignmentStatus: { in: ['ASSIGNED', 'ACTIVE'] },
          },
          _count: { _all: true },
        }),
        this.prismaService.dispatchRun.groupBy({
          by: ['dispatchStatus'],
          where: { organizationId },
          _count: { _all: true },
        }),
        this.prismaService.dispatchShift.count({
          where: {
            organizationId,
            deletedAt: null,
            startsAt: { lte: now },
            endsAt: { gte: now },
            status: { in: ['SCHEDULED', 'ACTIVE'] },
          },
        }),
      ]);

    const zoneIds = assignmentsByZone
      .map((entry) => entry.zoneId)
      .filter((zoneId): zoneId is string => Boolean(zoneId));

    const zones = zoneIds.length
      ? await this.prismaService.dispatchZone.findMany({
          where: { id: { in: zoneIds } },
          select: { id: true, code: true, name: true },
        })
      : [];

    const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));
    const highestAssignmentLoad = [...assignmentsByZone]
      .sort((left, right) => right._count._all - left._count._all)
      .slice(0, 5)
      .map((entry) => ({
        zoneId: entry.zoneId,
        zoneCode: entry.zoneId ? zoneMap.get(entry.zoneId)?.code ?? null : null,
        zoneName: entry.zoneId ? zoneMap.get(entry.zoneId)?.name ?? null : null,
        count: entry._count._all,
      }));

    return buildSuccessResponse('Operations summary retrieved successfully.', {
      organizationId,
      generatedAt: new Date().toISOString(),
      totals: {
        activeAssignments,
        activeRuns,
        releasedAssignmentsToday,
        openIncidents,
        activeShiftsToday,
      },
      incidentsBySeverity: incidentsBySeverity.map((entry) => ({
        severity: entry.severity,
        count: entry._count._all,
      })),
      assignmentsByZone: assignmentsByZone.map((entry) => ({
        zoneId: entry.zoneId,
        zoneCode: entry.zoneId ? zoneMap.get(entry.zoneId)?.code ?? null : null,
        zoneName: entry.zoneId ? zoneMap.get(entry.zoneId)?.name ?? null : null,
        count: entry._count._all,
      })),
      runsByDispatchStatus: runsByStatus.map((entry) => ({
        status: entry.dispatchStatus,
        count: entry._count._all,
      })),
      zonesWithHighestAssignmentLoad: highestAssignmentLoad,
    });
  }

  async getApprovalsSummary(principal: CurrentPrincipal, query: QueryDashboardOverviewDto) {
    const organizationId = await this.resolveOrganizationScope(principal, query);
    const now = new Date();

    const [pendingApprovalRequests, inProgressApprovalRequests, pendingApprovalSteps, overdueApprovalSteps, approvalsByStatus, approvalsAssignedToCurrentUser] =
      await Promise.all([
        this.prismaService.approvalRequest.count({
          where: { organizationId, status: ApprovalRequestStatus.PENDING },
        }),
        this.prismaService.approvalRequest.count({
          where: { organizationId, status: ApprovalRequestStatus.IN_PROGRESS },
        }),
        this.prismaService.approvalStep.count({
          where: {
            approvalRequest: { organizationId },
            status: ApprovalStepStatus.PENDING,
          },
        }),
        this.prismaService.approvalStep.count({
          where: {
            approvalRequest: { organizationId },
            status: ApprovalStepStatus.PENDING,
            dueAt: { lt: now },
          },
        }),
        this.prismaService.approvalRequest.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: { _all: true },
        }),
        this.prismaService.approvalStep.count({
          where: {
            approvalRequest: { organizationId },
            status: ApprovalStepStatus.PENDING,
            OR: [
              { approverUserId: principal.userId },
              ...(principal.roles.length > 0
                ? [{ approverRoleCode: { in: principal.roles } }]
                : []),
            ],
          },
        }),
      ]);

    return buildSuccessResponse('Approval summary retrieved successfully.', {
      organizationId,
      generatedAt: new Date().toISOString(),
      totals: {
        pendingApprovalRequests,
        inProgressApprovalRequests,
        pendingApprovalSteps,
        overdueApprovalSteps,
        approvalsAssignedToCurrentUser,
      },
      byStatus: approvalsByStatus.map((entry) => ({
        status: entry.status,
        count: entry._count._all,
      })),
    });
  }

  async getWorkflowsSummary(principal: CurrentPrincipal, query: QueryDashboardOverviewDto) {
    const organizationId = await this.resolveOrganizationScope(principal, query);
    const [activeWorkflowDefinitions, activeWorkflowInstances, completedWorkflowInstances, pendingTasks, inProgressTasks, escalatedTasks, tasksAssignedToCurrentUser] =
      await Promise.all([
        this.prismaService.workflowDefinition.count({
          where: { isActive: true },
        }),
        this.prismaService.workflowInstance.count({
          where: { organizationId, status: WorkflowInstanceStatus.ACTIVE },
        }),
        this.prismaService.workflowInstance.count({
          where: { organizationId, status: WorkflowInstanceStatus.COMPLETED },
        }),
        this.prismaService.workflowTask.count({
          where: {
            instance: { organizationId },
            status: WorkflowTaskStatus.PENDING,
          },
        }),
        this.prismaService.workflowTask.count({
          where: {
            instance: { organizationId },
            status: WorkflowTaskStatus.IN_PROGRESS,
          },
        }),
        this.prismaService.workflowTask.count({
          where: {
            instance: { organizationId },
            status: WorkflowTaskStatus.ESCALATED,
          },
        }),
        this.prismaService.workflowTask.count({
          where: {
            instance: { organizationId },
            status: { in: [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS] },
            OR: [
              { assigneeUserId: principal.userId },
              ...(principal.roles.length > 0
                ? [{ assigneeRoleCode: { in: principal.roles } }]
                : []),
            ],
          },
        }),
      ]);

    return buildSuccessResponse('Workflow summary retrieved successfully.', {
      organizationId,
      generatedAt: new Date().toISOString(),
      totals: {
        activeWorkflowDefinitions,
        activeWorkflowInstances,
        completedWorkflowInstances,
        pendingTasks,
        inProgressTasks,
        escalatedTasks,
        tasksAssignedToCurrentUser,
      },
    });
  }

  async getOperationalAlerts(principal: CurrentPrincipal, query: QueryDashboardAlertsDto) {
    const organizationId = await this.resolveOrganizationScope(principal, query);
    const now = new Date();

    const [drivers, vehicles, incidents, maintenanceRecords, overdueApprovalSteps, overdueWorkflowTasks] =
      await Promise.all([
        this.prismaService.driver.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              { complianceStatus: { in: [DriverComplianceStatus.NON_COMPLIANT, DriverComplianceStatus.EXPIRED] } },
              { operationalStatus: { in: [DriverOperationalStatus.SUSPENDED, DriverOperationalStatus.BLOCKED] } },
              { licenseExpiresAt: { lt: now } },
            ],
          },
          select: {
            id: true,
            driverCode: true,
            firstName: true,
            lastName: true,
            complianceStatus: true,
            operationalStatus: true,
            licenseExpiresAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
        this.prismaService.fleetVehicle.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              { complianceStatus: { in: [FleetComplianceStatus.NON_COMPLIANT, FleetComplianceStatus.EXPIRED] } },
              { operationalStatus: { in: [FleetOperationalStatus.OUT_OF_SERVICE, FleetOperationalStatus.BLOCKED, FleetOperationalStatus.SUSPENDED] } },
              { registrationExpiresAt: { lt: now } },
              { insuranceExpiresAt: { lt: now } },
            ],
          },
          select: {
            id: true,
            vehicleCode: true,
            plateNumber: true,
            complianceStatus: true,
            operationalStatus: true,
            registrationExpiresAt: true,
            insuranceExpiresAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
        this.prismaService.dispatchIncident.findMany({
          where: {
            organizationId,
            status: { in: [DispatchIncidentStatus.OPEN, DispatchIncidentStatus.IN_PROGRESS] },
            severity: DispatchIncidentSeverity.CRITICAL,
          },
          select: {
            id: true,
            incidentCode: true,
            title: true,
            status: true,
            severity: true,
            reportedAt: true,
          },
          orderBy: { reportedAt: 'desc' },
          take: 10,
        }),
        this.prismaService.fleetMaintenanceRecord.findMany({
          where: {
            vehicle: { organizationId, deletedAt: null },
            OR: [
              { status: FleetMaintenanceStatus.OVERDUE },
              {
                scheduledAt: { lt: now },
                status: { in: [FleetMaintenanceStatus.SCHEDULED, FleetMaintenanceStatus.IN_PROGRESS] },
              },
            ],
          },
          select: {
            id: true,
            title: true,
            status: true,
            scheduledAt: true,
            vehicle: {
              select: {
                id: true,
                vehicleCode: true,
                plateNumber: true,
              },
            },
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
        this.prismaService.approvalStep.findMany({
          where: {
            approvalRequest: { organizationId },
            status: ApprovalStepStatus.PENDING,
            dueAt: { lt: now },
          },
          select: {
            id: true,
            title: true,
            dueAt: true,
            approvalRequest: {
              select: {
                id: true,
                title: true,
              },
            },
            updatedAt: true,
          },
          orderBy: { dueAt: 'asc' },
          take: 10,
        }),
        this.prismaService.workflowTask.findMany({
          where: {
            instance: { organizationId },
            status: { in: [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS] },
            dueAt: { lt: now },
          },
          select: {
            id: true,
            title: true,
            dueAt: true,
            instance: {
              select: {
                id: true,
                entityType: true,
                entityId: true,
              },
            },
            updatedAt: true,
          },
          orderBy: { dueAt: 'asc' },
          take: 10,
        }),
      ]);

    const approvalBacklogCount = await this.prismaService.approvalStep.count({
      where: {
        approvalRequest: { organizationId },
        status: ApprovalStepStatus.PENDING,
      },
    });

    const alerts: OperationalAlert[] = [
      ...drivers.map((driver) => ({
        id: `driver-${driver.id}`,
        category: 'DRIVER_COMPLIANCE',
        severity: (
          driver.operationalStatus === DriverOperationalStatus.BLOCKED ||
          driver.operationalStatus === DriverOperationalStatus.SUSPENDED
            ? 'CRITICAL'
            : 'HIGH'
        ) as AlertSeverity,
        title: `Operator ${driver.driverCode} requires operational review`,
        description: `${driver.firstName} ${driver.lastName} is ${driver.complianceStatus.toLowerCase()} with operational status ${driver.operationalStatus.toLowerCase()}.`,
        entityType: 'driver',
        entityId: driver.id,
        createdAt: driver.updatedAt.toISOString(),
      })),
      ...vehicles.map((vehicle) => ({
        id: `asset-${vehicle.id}`,
        category: 'FLEET_COMPLIANCE',
        severity: (
          vehicle.operationalStatus === FleetOperationalStatus.OUT_OF_SERVICE ||
          vehicle.operationalStatus === FleetOperationalStatus.BLOCKED
            ? 'CRITICAL'
            : 'HIGH'
        ) as AlertSeverity,
        title: `Asset ${vehicle.vehicleCode} requires compliance attention`,
        description: `Asset ${vehicle.plateNumber} is ${vehicle.operationalStatus.toLowerCase()} with compliance status ${vehicle.complianceStatus.toLowerCase()}.`,
        entityType: 'asset',
        entityId: vehicle.id,
        createdAt: vehicle.updatedAt.toISOString(),
      })),
      ...incidents.map((incident) => ({
        id: `incident-${incident.id}`,
        category: 'DISPATCH_INCIDENT',
        severity: 'CRITICAL' as AlertSeverity,
        title: `Critical operational issue ${incident.incidentCode} is still open`,
        description: incident.title,
        entityType: 'operational-issue',
        entityId: incident.id,
        createdAt: incident.reportedAt.toISOString(),
      })),
      ...maintenanceRecords.map((record) => ({
        id: `maintenance-${record.id}`,
        category: 'MAINTENANCE',
        severity: 'MEDIUM' as AlertSeverity,
        title: `Maintenance overdue for asset ${record.vehicle.vehicleCode}`,
        description: `${record.title} remains ${record.status.toLowerCase()} for asset ${record.vehicle.plateNumber}.`,
        entityType: 'asset-maintenance-record',
        entityId: record.id,
        createdAt: record.updatedAt.toISOString(),
      })),
      ...overdueApprovalSteps.map((step) => ({
        id: `approval-${step.id}`,
        category: 'APPROVAL_QUEUE',
        severity: 'HIGH' as AlertSeverity,
        title: `Approval step overdue: ${step.title}`,
        description: `Approval request ${step.approvalRequest.title} is pending beyond its expected resolution time.`,
        entityType: 'approval-step',
        entityId: step.id,
        createdAt: step.dueAt?.toISOString() ?? step.updatedAt.toISOString(),
      })),
      ...overdueWorkflowTasks.map((task) => ({
        id: `workflow-${task.id}`,
        category: 'WORKFLOW_BOTTLENECK',
        severity: 'HIGH' as AlertSeverity,
        title: `Workflow task overdue: ${task.title}`,
        description: `Workflow task for ${task.instance.entityType} ${task.instance.entityId} is pending beyond due time.`,
        entityType: 'workflow-task',
        entityId: task.id,
        createdAt: task.dueAt?.toISOString() ?? task.updatedAt.toISOString(),
      })),
      ...(approvalBacklogCount >= 10
        ? [
            {
              id: `approval-backlog-${organizationId}`,
              category: 'APPROVAL_QUEUE',
              severity: 'HIGH' as AlertSeverity,
              title: 'Approval queue backlog threshold exceeded',
              description: `${approvalBacklogCount} approval steps are currently pending.`,
              entityType: 'approval-queue',
              entityId: organizationId,
              createdAt: now.toISOString(),
            },
          ]
        : []),
    ];

    const filteredAlerts = alerts.filter((alert) => {
      if (query.category && alert.category !== query.category) {
        return false;
      }

      if (query.severity && alert.severity !== query.severity) {
        return false;
      }

      return true;
    });

    return buildSuccessResponse('Operational alerts retrieved successfully.', {
      organizationId,
      generatedAt: now.toISOString(),
      totalAlerts: filteredAlerts.length,
      items: filteredAlerts.sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      ),
    });
  }

  async getWorkforceTrends(principal: CurrentPrincipal, query: QueryDashboardTrendDto) {
    const organizationId = await this.resolveOrganizationScope(principal, query);
    const days = query.days ?? 7;
    const sinceDate = this.startOfDay(this.daysAgo(days - 1));

    const [hireSeries, statusGroups] = await Promise.all([
      this.queryDailyCounts(
        Prisma.sql`
          SELECT date_trunc('day', "hireDate")::date AS bucket, COUNT(*)::int AS count
          FROM "employees"
          WHERE "organizationId" = ${organizationId}::uuid
            AND "deletedAt" IS NULL
            AND "hireDate" >= ${sinceDate}
          GROUP BY bucket
          ORDER BY bucket ASC
        `,
        days,
      ),
      this.prismaService.employee.groupBy({
        by: ['employmentStatus'],
        where: {
          organizationId,
          deletedAt: null,
          hireDate: { gte: sinceDate },
        },
        _count: { _all: true },
      }),
    ]);

    return buildSuccessResponse('Workforce trend data retrieved successfully.', {
      organizationId,
      generatedAt: new Date().toISOString(),
      days,
      hires: hireSeries,
      currentStatusMix: statusGroups.map((entry) => ({
        status: entry.employmentStatus,
        count: entry._count._all,
      })),
    });
  }

  async getDispatchTrends(principal: CurrentPrincipal, query: QueryDashboardTrendDto) {
    const organizationId = await this.resolveOrganizationScope(principal, query);
    const days = query.days ?? 7;
    const sinceDate = this.startOfDay(this.daysAgo(days - 1));

    const [assignmentSeries, runSeries, runStatusGroups] = await Promise.all([
      this.queryDailyCounts(
        Prisma.sql`
          SELECT date_trunc('day', "assignedAt")::date AS bucket, COUNT(*)::int AS count
          FROM "driver_vehicle_assignments"
          WHERE "organizationId" = ${organizationId}::uuid
            AND "assignedAt" >= ${sinceDate}
          GROUP BY bucket
          ORDER BY bucket ASC
        `,
        days,
      ),
      this.queryDailyCounts(
        Prisma.sql`
          SELECT date_trunc('day', COALESCE("startedAt", "createdAt"))::date AS bucket, COUNT(*)::int AS count
          FROM "dispatch_runs"
          WHERE "organizationId" = ${organizationId}::uuid
            AND COALESCE("startedAt", "createdAt") >= ${sinceDate}
          GROUP BY bucket
          ORDER BY bucket ASC
        `,
        days,
      ),
      this.prismaService.dispatchRun.groupBy({
        by: ['dispatchStatus'],
        where: {
          organizationId,
          createdAt: { gte: sinceDate },
        },
        _count: { _all: true },
      }),
    ]);

    return buildSuccessResponse('Operations trend data retrieved successfully.', {
      organizationId,
      generatedAt: new Date().toISOString(),
      days,
      assignmentsCreated: assignmentSeries,
      runsStarted: runSeries,
      runStatusMix: runStatusGroups.map((entry) => ({
        status: entry.dispatchStatus,
        count: entry._count._all,
      })),
    });
  }

  async getIncidentTrends(principal: CurrentPrincipal, query: QueryDashboardTrendDto) {
    const organizationId = await this.resolveOrganizationScope(principal, query);
    const days = query.days ?? 7;
    const sinceDate = this.startOfDay(this.daysAgo(days - 1));

    const [incidentSeries, severityGroups] = await Promise.all([
      this.queryDailyCounts(
        Prisma.sql`
          SELECT date_trunc('day', "reportedAt")::date AS bucket, COUNT(*)::int AS count
          FROM "dispatch_incidents"
          WHERE "organizationId" = ${organizationId}::uuid
            AND "reportedAt" >= ${sinceDate}
          GROUP BY bucket
          ORDER BY bucket ASC
        `,
        days,
      ),
      this.prismaService.dispatchIncident.groupBy({
        by: ['severity'],
        where: {
          organizationId,
          reportedAt: { gte: sinceDate },
        },
        _count: { _all: true },
      }),
    ]);

    return buildSuccessResponse('Operational issue trend data retrieved successfully.', {
      organizationId,
      generatedAt: new Date().toISOString(),
      days,
      incidentsReported: incidentSeries,
      severityMix: severityGroups.map((entry) => ({
        severity: entry.severity,
        count: entry._count._all,
      })),
    });
  }

  private async getWorkforceOverviewMetrics(organizationId: string) {
    const [totalEmployees, activeEmployees] = await Promise.all([
      this.prismaService.employee.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prismaService.employee.count({
        where: {
          organizationId,
          deletedAt: null,
          employmentStatus: EmploymentStatus.ACTIVE,
        },
      }),
    ]);

    return {
      totalEmployees,
      activeEmployees,
    };
  }

  private async getDriversOverviewMetrics(organizationId: string) {
    const [totalDrivers, activeDrivers, availableDrivers, nonCompliantDrivers] =
      await Promise.all([
        this.prismaService.driver.count({
          where: { organizationId, deletedAt: null },
        }),
        this.prismaService.driver.count({
          where: {
            organizationId,
            deletedAt: null,
            operationalStatus: DriverOperationalStatus.ACTIVE,
          },
        }),
        this.prismaService.driver.count({
          where: {
            organizationId,
            deletedAt: null,
            assignmentStatus: DriverAssignmentStatus.AVAILABLE,
          },
        }),
        this.prismaService.driver.count({
          where: {
            organizationId,
            deletedAt: null,
            complianceStatus: {
              in: [DriverComplianceStatus.NON_COMPLIANT, DriverComplianceStatus.EXPIRED],
            },
          },
        }),
      ]);

    return {
      totalDrivers,
      activeDrivers,
      availableDrivers,
      nonCompliantDrivers,
    };
  }

  private async getFleetOverviewMetrics(organizationId: string) {
    const [totalVehicles, activeVehicles, dispatchReadyVehicles, outOfServiceVehicles] =
      await Promise.all([
        this.prismaService.fleetVehicle.count({
          where: { organizationId, deletedAt: null },
        }),
        this.prismaService.fleetVehicle.count({
          where: {
            organizationId,
            deletedAt: null,
            operationalStatus: { in: ACTIVE_FLEET_STATUSES },
          },
        }),
        this.prismaService.fleetVehicle.count({
          where: this.buildDispatchReadyVehicleWhere(organizationId),
        }),
        this.prismaService.fleetVehicle.count({
          where: {
            organizationId,
            deletedAt: null,
            operationalStatus: FleetOperationalStatus.OUT_OF_SERVICE,
          },
        }),
      ]);

    return {
      totalVehicles,
      activeVehicles,
      dispatchReadyVehicles,
      outOfServiceVehicles,
    };
  }

  private async getDispatchOverviewMetrics(organizationId: string) {
    const [activeAssignments, activeRuns, openIncidents] = await Promise.all([
      this.prismaService.driverVehicleAssignment.count({
        where: {
          organizationId,
          assignmentStatus: { in: ['ASSIGNED', 'ACTIVE'] },
        },
      }),
      this.prismaService.dispatchRun.count({
        where: {
          organizationId,
          dispatchStatus: DispatchRunStatus.ACTIVE,
        },
      }),
      this.prismaService.dispatchIncident.count({
        where: {
          organizationId,
          status: { in: [DispatchIncidentStatus.OPEN, DispatchIncidentStatus.IN_PROGRESS] },
        },
      }),
    ]);

    return {
      activeAssignments,
      activeRuns,
      openIncidents,
    };
  }

  private async getApprovalOverviewMetrics(organizationId: string) {
    const [pendingApprovals, inProgressApprovals] = await Promise.all([
      this.prismaService.approvalRequest.count({
        where: { organizationId, status: ApprovalRequestStatus.PENDING },
      }),
      this.prismaService.approvalRequest.count({
        where: { organizationId, status: ApprovalRequestStatus.IN_PROGRESS },
      }),
    ]);

    return {
      pendingApprovals,
      inProgressApprovals,
    };
  }

  private async getWorkflowOverviewMetrics(organizationId: string) {
    const [activeWorkflowInstances, pendingWorkflowTasks] = await Promise.all([
      this.prismaService.workflowInstance.count({
        where: { organizationId, status: WorkflowInstanceStatus.ACTIVE },
      }),
      this.prismaService.workflowTask.count({
        where: {
          instance: { organizationId },
          status: WorkflowTaskStatus.PENDING,
        },
      }),
    ]);

    return {
      activeWorkflowInstances,
      pendingWorkflowTasks,
    };
  }

  private buildDispatchEligibleDriverWhere(organizationId: string): Prisma.DriverWhereInput {
    return {
      organizationId,
      deletedAt: null,
      onboardingStatus: { in: READY_DRIVER_ONBOARDING_STATUSES },
      operationalStatus: { in: ACTIVE_DRIVER_STATUSES },
      complianceStatus: { in: READY_DRIVER_COMPLIANCE_STATUSES },
      assignmentStatus: { in: AVAILABLE_DRIVER_STATUSES },
    };
  }

  private buildDispatchReadyVehicleWhere(organizationId: string): Prisma.FleetVehicleWhereInput {
    return {
      organizationId,
      deletedAt: null,
      onboardingStatus: { in: READY_FLEET_ONBOARDING_STATUSES },
      operationalStatus: { in: ACTIVE_FLEET_STATUSES },
      complianceStatus: { in: READY_FLEET_COMPLIANCE_STATUSES },
      assignmentStatus: { in: AVAILABLE_FLEET_STATUSES },
    };
  }

  private async resolveOrganizationScope(
    principal: CurrentPrincipal,
    query: SummaryQueryDto,
  ): Promise<string> {
    const organizationId = query.organizationId ?? principal.organizationId;
    await this.ensureOrganizationExists(organizationId);
    return organizationId;
  }

  private async ensureOrganizationExists(organizationId: string) {
    const organization = await this.prismaService.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID "${organizationId}" was not found.`);
    }
  }

  private async queryDailyCounts(query: Prisma.Sql, days: number): Promise<TrendPoint[]> {
    const rows = await this.prismaService.$queryRaw<Array<{ bucket: Date; count: number }>>(query);
    const countMap = new Map(
      rows.map((row) => [this.startOfDay(new Date(row.bucket)).toISOString().slice(0, 10), Number(row.count)]),
    );

    return this.buildEmptyDailySeries(days).map((date) => ({
      date,
      count: countMap.get(date) ?? 0,
    }));
  }

  private buildEmptyDailySeries(days: number): string[] {
    const dates: string[] = [];

    for (let index = days - 1; index >= 0; index -= 1) {
      dates.push(this.startOfDay(this.daysAgo(index)).toISOString().slice(0, 10));
    }

    return dates;
  }

  private daysAgo(days: number): Date {
    const value = new Date();
    value.setDate(value.getDate() - days);
    return value;
  }

  private daysFromNow(days: number): Date {
    const value = new Date();
    value.setDate(value.getDate() + days);
    return value;
  }

  private startOfDay(value: Date): Date {
    const start = new Date(value);
    start.setHours(0, 0, 0, 0);
    return start;
  }
}
