import { apiClient } from '@/lib/api-client';
import {
  AlertItem,
  ApprovalsSummary,
  DashboardOverview,
  OperationsTrendData,
  OperationsSummary,
  OperatorsSummary,
  AssetsSummary,
  IncidentTrendData,
  WorkforceSummary,
  WorkforceTrendData,
  WorkflowsSummary,
} from '@/types/dashboard';

export const dashboardService = {
  async overview(organizationId?: string): Promise<DashboardOverview> {
    const response = await apiClient.get<any>('/dashboard/overview', {
      query: { organizationId },
    });
    const data = response.data;

    // Map legacy backend keys to canonical frontend DashboardOverview interface
    return {
      organizationId: data.organizationId,
      generatedAt: data.generatedAt,
      workforce: data.workforce,
      operators: {
        totalOperators: data.drivers.totalDrivers,
        activeOperators: data.drivers.activeDrivers,
        availableOperators: data.drivers.availableDrivers,
        nonCompliantOperators: data.drivers.nonCompliantDrivers,
      },
      assets: {
        totalAssets: data.fleet.totalVehicles,
        activeAssets: data.fleet.activeVehicles,
        operationallyReadyAssets: data.fleet.dispatchReadyVehicles,
        outOfServiceAssets: data.fleet.outOfServiceVehicles,
      },
      operations: {
        activeAssignments: data.dispatch.activeAssignments,
        activeWorkOrders: data.dispatch.activeRuns,
        openIncidents: data.dispatch.openIncidents,
      },
      approvals: data.approvals,
      workflows: data.workflows,
    };
  },

  async workforceSummary(organizationId?: string): Promise<WorkforceSummary> {
    const response = await apiClient.get<WorkforceSummary>('/dashboard/workforce-summary', {
      query: { organizationId },
    });
    return response.data;
  },

  async operatorsSummary(organizationId?: string): Promise<OperatorsSummary> {
    const response = await apiClient.get<any>('/dashboard/operators-summary', {
      query: { organizationId },
    });
    const data = response.data;

    return {
      totals: {
        totalOperators: data.totals.totalDrivers,
        activeOperators: data.totals.activeDrivers,
        availableOperators: data.totals.availableDrivers,
        suspendedOperators: data.totals.suspendedDrivers,
        nonCompliantOperators: data.totals.nonCompliantDrivers,
        onboardingPendingOperators: data.totals.onboardingPendingDrivers,
        dispatchEligibleOperators: data.totals.dispatchEligibleDrivers,
      },
      byOperationalStatus: data.byOperationalStatus,
      byComplianceStatus: data.byComplianceStatus,
    };
  },

  /** @deprecated Use operatorsSummary() */
  driversSummary(organizationId?: string) {
    return this.operatorsSummary(organizationId);
  },

  async assetsSummary(organizationId?: string): Promise<AssetsSummary> {
    const response = await apiClient.get<any>('/dashboard/assets-summary', {
      query: { organizationId },
    });
    const data = response.data;

    return {
      totals: {
        totalAssets: data.totals.totalVehicles,
        activeAssets: data.totals.activeVehicles,
        availableAssets: data.totals.availableVehicles,
        outOfServiceAssets: data.totals.outOfServiceVehicles,
        nonCompliantAssets: data.totals.nonCompliantVehicles,
        operationallyReadyAssets: data.totals.dispatchReadyVehicles,
        expiringComplianceArtifacts: data.totals.expiringComplianceArtifacts,
        overdueMaintenanceCount: data.totals.overdueMaintenanceCount,
      },
      byAssetClass: data.byVehicleClass.map((item: any) => ({
        assetClass: item.vehicleClass,
        count: item.count,
      })),
    };
  },

  /** @deprecated Use assetsSummary() */
  fleetSummary(organizationId?: string) {
    return this.assetsSummary(organizationId);
  },

  async operationsSummary(organizationId?: string): Promise<OperationsSummary> {
    const response = await apiClient.get<any>('/dashboard/operations-summary', {
      query: { organizationId },
    });
    const data = response.data;

    return {
      totals: {
        activeAssignments: data.totals.activeAssignments,
        activeWorkOrders: data.totals.activeRuns,
        releasedAssignmentsToday: data.totals.releasedAssignmentsToday,
        openIncidents: data.totals.openIncidents,
        activeShiftsToday: data.totals.activeShiftsToday,
      },
      incidentsBySeverity: data.incidentsBySeverity,
      assignmentsByZone: data.assignmentsByZone,
      workOrdersByStatus: data.runsByDispatchStatus,
      zonesWithHighestAssignmentLoad: data.zonesWithHighestAssignmentLoad,
    };
  },

  /** @deprecated Use operationsSummary() */
  dispatchSummary(organizationId?: string) {
    return this.operationsSummary(organizationId);
  },

  async approvalsSummary(organizationId?: string): Promise<ApprovalsSummary> {
    const response = await apiClient.get<ApprovalsSummary>('/dashboard/approvals-summary', {
      query: { organizationId },
    });
    return response.data;
  },

  async workflowsSummary(organizationId?: string): Promise<WorkflowsSummary> {
    const response = await apiClient.get<WorkflowsSummary>('/dashboard/workflows-summary', {
      query: { organizationId },
    });
    return response.data;
  },

  alerts(organizationId?: string) {
    return apiClient.get<{ totalAlerts: number; items: AlertItem[] }>('/dashboard/alerts', {
      query: { organizationId },
    });
  },

  workforceTrends(days = 7, organizationId?: string) {
    return apiClient.get<WorkforceTrendData>('/dashboard/trends/workforce', {
      query: { organizationId, days },
    });
  },

  async operationsTrends(days = 7, organizationId?: string): Promise<OperationsTrendData> {
    const response = await apiClient.get<any>('/dashboard/trends/operations', {
      query: { organizationId, days },
    });
    const data = response.data;

    return {
      organizationId: data.organizationId,
      generatedAt: data.generatedAt,
      days: data.days,
      assignmentsCreated: data.assignmentsCreated,
      workOrdersStarted: data.runsStarted,
      workOrderStatusMix: data.runStatusMix,
    };
  },

  /** @deprecated Use operationsTrends() */
  dispatchTrends(days = 7, organizationId?: string) {
    return this.operationsTrends(days, organizationId);
  },

  incidentTrends(days = 7, organizationId?: string) {
    return apiClient.get<IncidentTrendData>('/dashboard/trends/incidents', {
      query: { organizationId, days },
    });
  },
};
