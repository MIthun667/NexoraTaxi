export interface DashboardOverview {
  organizationId: string;
  generatedAt: string;
  workforce: {
    totalEmployees: number;
    activeEmployees: number;
  };
  operators: {
    totalOperators: number;
    activeOperators: number;
    availableOperators: number;
    nonCompliantOperators: number;
  };
  assets: {
    totalAssets: number;
    activeAssets: number;
    operationallyReadyAssets: number;
    outOfServiceAssets: number;
  };
  operations: {
    activeAssignments: number;
    activeWorkOrders: number;
    openIncidents: number;
  };
  approvals: {
    pendingApprovals: number;
    inProgressApprovals: number;
  };
  workflows: {
    activeWorkflowInstances: number;
    pendingWorkflowTasks: number;
  };
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface NameCount {
  departmentId: string | null;
  departmentName: string | null;
  departmentCode: string | null;
  count: number;
}

export interface OperatorsSummary {
  totals: {
    totalOperators: number;
    activeOperators: number;
    availableOperators: number;
    suspendedOperators: number;
    nonCompliantOperators: number;
    onboardingPendingOperators: number;
    dispatchEligibleOperators: number;
  };
  byOperationalStatus: StatusCount[];
  byComplianceStatus: StatusCount[];
}

/** @deprecated Use OperatorsSummary instead. */
export type DriversSummary = OperatorsSummary;

export interface AssetsSummary {
  totals: {
    totalAssets: number;
    activeAssets: number;
    availableAssets: number;
    outOfServiceAssets: number;
    nonCompliantAssets: number;
    operationallyReadyAssets: number;
    expiringComplianceArtifacts: number;
    overdueMaintenanceCount: number;
  };
  byAssetClass: Array<{
    assetClass: string;
    count: number;
  }>;
}

/** @deprecated Use AssetsSummary instead. */
export type FleetSummary = AssetsSummary;

export interface OperationsSummary {
  totals: {
    activeAssignments: number;
    activeWorkOrders: number;
    releasedAssignmentsToday: number;
    openIncidents: number;
    activeShiftsToday: number;
  };
  incidentsBySeverity: Array<{
    severity: string;
    count: number;
  }>;
  assignmentsByZone: Array<{
    zoneId: string | null;
    zoneCode: string | null;
    zoneName: string | null;
    count: number;
  }>;
  workOrdersByStatus: StatusCount[];
  zonesWithHighestAssignmentLoad: Array<{
    zoneId: string | null;
    zoneCode: string | null;
    zoneName: string | null;
    count: number;
  }>;
}

/** @deprecated Use OperationsSummary instead. */
export type DispatchSummary = OperationsSummary;

export interface ApprovalsSummary {
  totals: {
    pendingApprovalRequests: number;
    inProgressApprovalRequests: number;
    pendingApprovalSteps: number;
    overdueApprovalSteps: number;
    approvalsAssignedToCurrentUser: number;
  };
  byStatus: StatusCount[];
}

export interface WorkforceSummary {
  organizationId: string;
  generatedAt: string;
  totals: {
    totalEmployees: number;
    activeEmployees: number;
    onboardingEmployees: number;
    probationEmployees: number;
    leaveOfAbsenceEmployees: number;
    recentlyHiredCount: number;
  };
  byEmploymentStatus: StatusCount[];
  byDepartment: NameCount[];
}

export interface WorkflowsSummary {
  organizationId: string;
  generatedAt: string;
  totals: {
    activeWorkflowDefinitions: number;
    activeWorkflowInstances: number;
    completedWorkflowInstances: number;
    pendingTasks: number;
    inProgressTasks: number;
    escalatedTasks: number;
    tasksAssignedToCurrentUser: number;
  };
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface WorkforceTrendData {
  organizationId: string;
  generatedAt: string;
  days: number;
  hires: TrendPoint[];
  currentStatusMix: StatusCount[];
}

export interface OperationsTrendData {
  organizationId: string;
  generatedAt: string;
  days: number;
  assignmentsCreated: TrendPoint[];
  workOrdersStarted: TrendPoint[];
  workOrderStatusMix: StatusCount[];
}

/** @deprecated Use OperationsTrendData instead. */
export type DispatchTrendData = OperationsTrendData;

export interface IncidentTrendData {
  organizationId: string;
  generatedAt: string;
  days: number;
  incidentsReported: TrendPoint[];
  severityMix: Array<{
    severity: string;
    count: number;
  }>;
}

export interface AlertItem {
  id: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}
