import type { PrismaClient } from '@prisma/client';

export type SeedMode = 'reset' | 'append';

export type SeedDepartment = {
  id: string;
  code: string;
  name: string;
  status?: string;
  description?: string | null;
};

export type SeedPosition = {
  id: string;
  code: string;
  title: string;
  departmentId?: string | null;
  status?: string;
};

export type SeedEmployee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  phoneNumber?: string | null;
  hireDate?: Date | null;
  departmentId?: string | null;
  positionId?: string | null;
  userId?: string | null;
};

export type SeedUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

export type SeedZone = { id: string; zoneCode: string; name: string; parentZoneId?: string | null };
export type SeedWorkforceMember = { id: string; workerCode: string; displayName?: string | null };
export type SeedAsset = { id: string; assetCode: string; name: string };
export type SeedSchedulePlan = { id: string; name: string };
export type SeedScheduleShift = {
  id: string;
  shiftCode: string;
  capacityRequired?: number | null;
  capacityAllocated?: number | null;
};
export type SeedWorkOrder = { id: string; workOrderCode: string; title: string };
export type SeedIncident = { id: string; incidentCode: string; title: string; reportedAt: Date };
export type SeedAssignment = { id: string; shiftId?: string | null; status: string; assignmentType: string };

export type CoreSeedContext = {
  prisma: PrismaClient;
  mode: SeedMode;
  now: Date;
  organizationId: string;
  organizationName: string;
  departments: SeedDepartment[];
  positions: SeedPosition[];
  employees: SeedEmployee[];
  users: SeedUser[];
};

export type SeedSummary = Record<string, number>;

export type WorkforceSeedResult = {
  workforceMembers: SeedWorkforceMember[];
  credentialDocuments: number;
  statusHistoryEntries: number;
  profileExtensions: number;
  authorizations: number;
  extensionPopulation: {
    profileEligibleCount: number;
    profileMissingSourceCount: number;
    authorizationEligibleCount: number;
    authorizationMissingSourceCount: number;
    authorizationDeferredCount: number;
    evidenceLinkedCount: number;
  };
};

export type AssetSeedResult = {
  assets: SeedAsset[];
  statusHistoryEntries: number;
};

export type SchedulingSeedResult = {
  plans: SeedSchedulePlan[];
  shifts: SeedScheduleShift[];
};

export type WorkOrderSeedResult = {
  workOrders: SeedWorkOrder[];
};

export type AssignmentSeedResult = {
  assignments: SeedAssignment[];
};

export type IncidentSeedResult = {
  incidents: SeedIncident[];
  incidentActions: number;
};

export type MaintenanceSeedResult = {
  maintenanceRecords: number;
};

export type AiActivitySeedResult = {
  agentDefinitions: number;
  agentPolicyRules: number;
  agentRuns: number;
  agentObservations: number;
  agentDecisions: number;
  agentActionProposals: number;
  agentVerificationResults: number;
  agentFeedback: number;
  agentEvaluationResults: number;
  inferenceAuditLogs: number;
  executionMetrics: number;
  policyViolations: number;
  operationalImpacts: number;
  domainEvents: number;
  triggerRules: number;
  triggerExecutionLogs: number;
  notifications: number;
};

export type IntegrationSeedResult = {
  connectorDefinitions: number;
  connectorInstances: number;
  connectorCredentials: number;
  connectorSyncJobs: number;
  connectorActionLogs: number;
};

export type TenancySeedResult = {
  subscriptionPlans: number;
  organizationSubscriptions: number;
  organizationUsage: number;
  organizationBillingEvents: number;
};

export type ObservabilitySeedResult = {
  systemAlerts: number;
  healthCheckLogs: number;
};
