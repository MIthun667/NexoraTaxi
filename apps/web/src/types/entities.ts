export interface Driver {
  id: string;
  organizationId: string;
  employeeId?: string | null;
  userId?: string | null;
  /** @deprecated Use workforceId */
  driverCode: string;
  /** Canonical alias for driverCode */
  workforceId: string;
  firstName: string;
  lastName: string;
  workEmail: string | null;
  phoneNumber: string | null;
  /** @deprecated Use credentialId */
  licenseNumber: string;
  /** Canonical alias for licenseNumber */
  credentialId: string;
  licenseIssuedAt?: string | null;
  licenseExpiresAt?: string | null;
  onboardingStatus: string;
  operationalStatus: string;
  complianceStatus: string;
  assignmentStatus: string;
  joinedAt: string;
  suspendedAt?: string | null;
  deactivatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isEligibleForAssignment?: boolean;
}

export interface FleetVehicle {
  id: string;
  organizationId: string;
  /** @deprecated Use assetId */
  vehicleCode: string;
  /** Canonical alias for vehicleCode */
  assetId: string;
  plateNumber: string;
  vin?: string | null;
  make: string;
  model: string;
  modelYear: number;
  color?: string | null;
  /** @deprecated Use assetCategory */
  vehicleClass: string;
  /** Canonical alias for vehicleClass */
  assetCategory: string;
  registrationNumber?: string | null;
  registrationIssuedAt?: string | null;
  registrationExpiresAt?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceExpiresAt?: string | null;
  onboardingStatus: string;
  operationalStatus: string;
  complianceStatus: string;
  assignmentStatus: string;
  joinedAt: string;
  decommissionedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isDispatchReady?: boolean;
}

export interface DispatchAssignment {
  id: string;
  organizationId: string;
  /** @deprecated Use operatorId */
  driverId?: string;
  /** Canonical alias for driverId */
  operatorId?: string;
  /** @deprecated Use assetId */
  vehicleId?: string;
  /** Canonical alias for vehicleId */
  assetId?: string;
  zoneId?: string | null;
  shiftId?: string | null;
  assignmentStatus: string;
  assignedAt: string;
  releasedAt: string | null;
  assignedByUserId?: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApprovalQueueItem {
  id: string;
  title: string;
  stepKey: string;
  status: string;
  dueAt: string | null;
  approvalRequest?: {
    id: string;
    title: string;
    entityType: string;
    entityId: string;
    status: string;
  };
}

export interface DriverDocument {
  id: string;
  /** @deprecated Use operatorId */
  driverId: string;
  /** Canonical alias for driverId */
  operatorId: string;
  documentType: string;
  documentNumber: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  verificationStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverStatusHistoryEntry {
  id: string;
  /** @deprecated Use operatorId */
  driverId: string;
  /** Canonical alias for driverId */
  operatorId: string;
  statusCategory: string;
  previousValue: string | null;
  newValue: string;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface FleetMaintenanceRecord {
  id: string;
  /** @deprecated Use assetId */
  vehicleId: string;
  /** Canonical alias for vehicleId */
  assetId: string;
  maintenanceType: string;
  title: string;
  description: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  status: string;
  vendorName: string | null;
  costAmount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FleetStatusHistoryEntry {
  id: string;
  /** @deprecated Use assetId */
  vehicleId: string;
  /** Canonical alias for vehicleId */
  assetId: string;
  statusCategory: string;
  previousValue: string | null;
  newValue: string;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface DispatchZone {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchShift {
  id: string;
  organizationId: string;
  code: string;
  title: string;
  description: string | null;
  zoneId: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  supervisorUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchRun {
  id: string;
  organizationId: string;
  assignmentId: string;
  zoneId: string | null;
  /** @deprecated Use workOrderId */
  runCode: string;
  /** Canonical alias for runCode */
  workOrderId: string;
  /** @deprecated Use operationStatus */
  dispatchStatus: string;
  /** Canonical alias for dispatchStatus */
  operationStatus: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchIncident {
  id: string;
  organizationId: string;
  /** @deprecated Use workOrderId */
  runId: string | null;
  /** Canonical alias for runId */
  workOrderId: string | null;
  assignmentId: string | null;
  incidentCode: string;
  incidentType: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  reportedByUserId: string | null;
  reportedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequest {
  id: string;
  organizationId: string;
  workflowInstanceId: string | null;
  entityType: string;
  entityId: string;
  title: string;
  description: string | null;
  status: string;
  requestedByUserId: string;
  submittedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  steps: ApprovalStep[];
}

export interface ApprovalStep {
  id: string;
  stepKey: string;
  title: string;
  description: string | null;
  sequenceOrder: number;
  status: string;
  approverUserId: string | null;
  approverRoleCode: string | null;
  dueAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalStepDetail extends ApprovalStep {
  approvalRequest: {
    id: string;
    organizationId: string;
    entityType: string;
    entityId: string;
    title: string;
    status: string;
    workflowInstanceId: string | null;
  };
  decisions: ApprovalDecision[];
}

export interface ApprovalDecision {
  id: string;
  actorUserId: string;
  decisionType: string;
  comment: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface WorkflowDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  moduleKey: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  escalationRules?: Array<{
    id: string;
    taskKey: string;
    escalationType: string;
    thresholdMinutes: number;
    targetRoleCode: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface WorkflowTask {
  id: string;
  taskKey: string;
  title: string;
  description: string | null;
  status: string;
  assigneeUserId: string | null;
  assigneeRoleCode: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTaskListItem extends WorkflowTask {
  instance: {
    id: string;
    entityType: string;
    entityId: string;
    status: string;
    definition: {
      code: string;
      name: string;
      moduleKey: string;
    };
  };
}

export interface WorkflowTaskDetail extends WorkflowTask {
  instance: {
    id: string;
    organizationId: string;
    entityType: string;
    entityId: string;
    status: string;
    definition: {
      id: string;
      code: string;
      name: string;
      moduleKey: string;
      version: number;
    };
  };
  actions: WorkflowTaskAction[];
}

export interface WorkflowTaskAction {
  id: string;
  actionType: string;
  actionLabel: string;
  actorUserId: string;
  comment: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface WorkflowInstance {
  id: string;
  status: string;
  entityType: string;
  entityId: string;
  organizationId: string;
  startedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  definition: WorkflowDefinition;
  tasks: WorkflowTask[];
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  phoneNumber: string | null;
  employmentStatus: string;
  hireDate: string;
  organizationId: string;
  departmentId: string | null;
  positionId: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  title: string;
  code: string;
  description: string | null;
  gradeLevel: string | null;
  status: string;
  organizationId: string;
  departmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
