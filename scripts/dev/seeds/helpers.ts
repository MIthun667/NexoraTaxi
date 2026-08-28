import {
  AgentActionProposalStatus,
  AgentConfidenceLevel,
  AgentDecisionType,
  AgentFeedbackSourceType,
  AgentFeedbackType,
  AgentObservationType,
  AgentRiskLevel,
  AgentRunStatus,
  AgentTriggerType,
  AgentVerificationStatus,
  AgentVerificationType,
  AssetAvailabilityStatus,
  AssetComplianceStatus,
  AssetMaintenanceStatus,
  AssetMaintenanceType,
  AssetOperationalStatus,
  AssetStatusCategory,
  AssetType,
  AssignmentType,
  CredentialDocumentType,
  CredentialVerificationStatus,
  DomainActorType,
  DomainEventProcessingStatus,
  IncidentActionType,
  IncidentSeverity,
  NotificationCategory,
  NotificationSeverity,
  NotificationStatus,
  OperationalIncidentStatus,
  OperationalZoneType,
  ResourceAssignmentStatus,
  SchedulePlanStatus,
  SchedulePlanType,
  ScheduleShiftStatus,
  ShiftType,
  TriggerActionType,
  TriggerExecutionStatus,
  WorkforceAvailabilityStatus,
  WorkforceComplianceStatus,
  WorkforceEmploymentModel,
  WorkforceOperationalStatus,
  WorkforceStatusCategory,
  WorkforceMemberType,
  WorkOrderPriority,
  WorkOrderStatus,
  InferenceStatus,
} from '@prisma/client';

import { deterministicUuid, rotatePick, startOfDay } from '../seed/utils';

export const DEMO_REFERENCE_DATE = new Date('2026-03-14T08:00:00.000Z');

export const WORKFORCE_TARGET = 80;
export const ASSET_TARGET = 60;
export const ZONE_TARGET = 10;
export const SCHEDULE_PLAN_TARGET = 6;
export const SHIFT_TARGET = 70;
export const WORK_ORDER_TARGET = 120;
export const INCIDENT_TARGET = 40;
export const ASSIGNMENT_TARGET = 110;
export const CREDENTIAL_TARGET = 80;
export const MAINTENANCE_TARGET = 30;

export const range = (count: number): number[] => Array.from({ length: count }, (_, index) => index);

export const shiftDate = (dayOffset: number, hour: number): Date => {
  const day = new Date(DEMO_REFERENCE_DATE);
  day.setUTCDate(day.getUTCDate() + dayOffset);
  return new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, 0, 0, 0),
  );
};

export const addHours = (date: Date, hours: number): Date =>
  new Date(date.getTime() + hours * 60 * 60 * 1000);

export const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

export const subtractDays = (date: Date, days: number): Date => addDays(date, -days);

export const cycleEnum = <T>(items: readonly T[], index: number): T => rotatePick(items, index);

export const seededNumber = (seed: string, modulo: number): number => {
  const compact = deterministicUuid(seed).replace(/-/g, '');
  return parseInt(compact.slice(0, 8), 16) % modulo;
};

export const seededPick = <T>(items: readonly T[], seed: string): T =>
  items[seededNumber(seed, items.length)];

export const pickStatusValue = (
  category: WorkforceStatusCategory | AssetStatusCategory,
  index: number,
): string => {
  if (category === WorkforceStatusCategory.OPERATIONAL_STATUS) {
    return cycleEnum(Object.values(WorkforceOperationalStatus), index);
  }

  if (category === WorkforceStatusCategory.COMPLIANCE_STATUS) {
    return cycleEnum(Object.values(WorkforceComplianceStatus), index);
  }

  if (category === WorkforceStatusCategory.AVAILABILITY_STATUS) {
    return cycleEnum(Object.values(WorkforceAvailabilityStatus), index);
  }

  if (category === AssetStatusCategory.OPERATIONAL_STATUS) {
    return cycleEnum(Object.values(AssetOperationalStatus), index);
  }

  if (category === AssetStatusCategory.COMPLIANCE_STATUS) {
    return cycleEnum(Object.values(AssetComplianceStatus), index);
  }

  return cycleEnum(Object.values(AssetAvailabilityStatus), index);
};

export const WORKER_SKILL_POOL = [
  'route-planning',
  'incident-response',
  'safety-checks',
  'forklift-certified',
  'operations-coordination',
  'maintenance-support',
  'radio-operations',
  'hazmat-awareness',
  'field-inspection',
  'customer-handoff',
] as const;

export const VEHICLE_CLASSES = ['Cargo Van', 'Service Truck', 'Forklift', 'Inspection EV'] as const;
export const DEVICE_CLASSES = ['Rugged Tablet', 'Handheld Scanner', 'IoT Gateway'] as const;
export const EQUIPMENT_CLASSES = ['Generator', 'Lift Platform', 'Dock Loader'] as const;
export const TOOL_CLASSES = ['Diagnostic Kit', 'Safety Kit', 'Power Tool Set'] as const;
export const FACILITY_CLASSES = ['Hub Bay', 'Control Room', 'Charging Station'] as const;

export const ZONE_BLUEPRINTS = [
  { code: 'REG-NORTH', name: 'North Region', type: OperationalZoneType.REGION, parentCode: null },
  { code: 'REG-CENTRAL', name: 'Central Region', type: OperationalZoneType.REGION, parentCode: null },
  { code: 'REG-SOUTH', name: 'South Region', type: OperationalZoneType.REGION, parentCode: null },
  { code: 'SA-NORTH-1', name: 'North Service Area 1', type: OperationalZoneType.SERVICE_AREA, parentCode: 'REG-NORTH' },
  { code: 'SA-NORTH-2', name: 'North Service Area 2', type: OperationalZoneType.SERVICE_AREA, parentCode: 'REG-NORTH' },
  { code: 'SA-CENTRAL-1', name: 'Central Service Area 1', type: OperationalZoneType.SERVICE_AREA, parentCode: 'REG-CENTRAL' },
  { code: 'SA-CENTRAL-2', name: 'Central Service Area 2', type: OperationalZoneType.SERVICE_AREA, parentCode: 'REG-CENTRAL' },
  { code: 'SA-SOUTH-1', name: 'South Service Area 1', type: OperationalZoneType.SERVICE_AREA, parentCode: 'REG-SOUTH' },
  { code: 'OPS-HQ', name: 'Operations HQ', type: OperationalZoneType.FACILITY, parentCode: null },
  { code: 'MAIN-HUB', name: 'Main Logistics Hub', type: OperationalZoneType.CAMPUS, parentCode: null },
] as const;

export const WORK_ORDER_TYPES = [
  'DELIVERY_ROUTE',
  'FIELD_REPAIR',
  'SITE_INSPECTION',
  'EMERGENCY_RESPONSE',
  'MAINTENANCE_VISIT',
  'SUPPORT_DISPATCH',
] as const;

export const INCIDENT_TYPES = [
  'DELAY',
  'EQUIPMENT_FAILURE',
  'SAFETY_ALERT',
  'STAFFING_GAP',
  'COMPLIANCE_EXCEPTION',
  'ROUTE_DISRUPTION',
] as const;

export const AGENT_DEFINITION_BLUEPRINTS = [
  { code: 'incident-triage-agent', name: 'Incident Triage Agent', category: 'OPS_COORDINATOR' },
  { code: 'shift-coverage-agent', name: 'Shift Coverage Agent', category: 'WORKFLOW_ORCHESTRATOR' },
  { code: 'asset-readiness-agent', name: 'Asset Readiness Agent', category: 'RISK_MONITOR' },
  { code: 'executive-brief-agent', name: 'Executive Brief Agent', category: 'EXECUTIVE_COPILOT' },
] as const;

export const ACTION_TYPES = [
  'CREATE_ASSIGNMENT',
  'ESCALATE_INCIDENT',
  'UPDATE_SHIFT_CAPACITY',
  'SCHEDULE_ASSET_MAINTENANCE',
  'SEND_NOTIFICATION',
] as const;

export const agentRunStatuses = [
  AgentRunStatus.VERIFIED_SUCCESS,
  AgentRunStatus.VERIFIED_SUCCESS,
  AgentRunStatus.VERIFIED_PARTIAL,
  AgentRunStatus.WAITING_APPROVAL,
  AgentRunStatus.FAILED,
  AgentRunStatus.SUCCEEDED,
] as const;

export const incidentSeverityDistribution = [
  ...range(20).map(() => IncidentSeverity.LOW),
  ...range(12).map(() => IncidentSeverity.MEDIUM),
  ...range(6).map(() => IncidentSeverity.HIGH),
  ...range(2).map(() => IncidentSeverity.CRITICAL),
] as const;

export const operationalIncidentStatuses = [
  OperationalIncidentStatus.OPEN,
  OperationalIncidentStatus.IN_PROGRESS,
  OperationalIncidentStatus.RESOLVED,
  OperationalIncidentStatus.CANCELLED,
] as const;

export const workOrderStatuses = [
  ...range(18).map(() => WorkOrderStatus.PLANNED),
  ...range(10).map(() => WorkOrderStatus.READY),
  ...range(32).map(() => WorkOrderStatus.ACTIVE),
  ...range(10).map(() => WorkOrderStatus.BLOCKED),
  ...range(42).map(() => WorkOrderStatus.COMPLETED),
  ...range(4).map(() => WorkOrderStatus.CANCELLED),
  ...range(4).map(() => WorkOrderStatus.FAILED),
] as const;

export const shiftStatuses = [
  ...range(36).map(() => ScheduleShiftStatus.SCHEDULED),
  ...range(18).map(() => ScheduleShiftStatus.ACTIVE),
  ...range(14).map(() => ScheduleShiftStatus.COMPLETED),
  ...range(2).map(() => ScheduleShiftStatus.CANCELLED),
] as const;

export const workforceOperationalStatuses = [
  ...range(52).map(() => WorkforceOperationalStatus.ACTIVE),
  ...range(8).map(() => WorkforceOperationalStatus.OFF_DUTY),
  ...range(7).map(() => WorkforceOperationalStatus.ON_LEAVE),
  ...range(5).map(() => WorkforceOperationalStatus.SUSPENDED),
  ...range(4).map(() => WorkforceOperationalStatus.BLOCKED),
  ...range(4).map(() => WorkforceOperationalStatus.INACTIVE),
] as const;

export const workforceAvailabilityStatuses = [
  ...range(34).map(() => WorkforceAvailabilityStatus.AVAILABLE),
  ...range(20).map(() => WorkforceAvailabilityStatus.ASSIGNED),
  ...range(8).map(() => WorkforceAvailabilityStatus.RESERVED),
  ...range(10).map(() => WorkforceAvailabilityStatus.UNAVAILABLE),
  ...range(8).map(() => WorkforceAvailabilityStatus.RESTRICTED),
] as const;

export const workforceComplianceStatuses = [
  ...range(56).map(() => WorkforceComplianceStatus.COMPLIANT),
  ...range(12).map(() => WorkforceComplianceStatus.PENDING),
  ...range(7).map(() => WorkforceComplianceStatus.UNDER_REVIEW),
  ...range(3).map(() => WorkforceComplianceStatus.NON_COMPLIANT),
  ...range(2).map(() => WorkforceComplianceStatus.EXPIRED),
] as const;

export const assetOperationalStatuses = [
  ...range(32).map(() => AssetOperationalStatus.ACTIVE),
  ...range(8).map(() => AssetOperationalStatus.IN_SERVICE),
  ...range(9).map(() => AssetOperationalStatus.OUT_OF_SERVICE),
  ...range(5).map(() => AssetOperationalStatus.BLOCKED),
  ...range(4).map(() => AssetOperationalStatus.INACTIVE),
  ...range(2).map(() => AssetOperationalStatus.RETIRED),
] as const;

export const assetAvailabilityStatuses = [
  ...range(26).map(() => AssetAvailabilityStatus.AVAILABLE),
  ...range(18).map(() => AssetAvailabilityStatus.ASSIGNED),
  ...range(6).map(() => AssetAvailabilityStatus.RESERVED),
  ...range(8).map(() => AssetAvailabilityStatus.UNAVAILABLE),
  ...range(2).map(() => AssetAvailabilityStatus.RESTRICTED),
] as const;

export const assetComplianceStatuses = [
  ...range(44).map(() => AssetComplianceStatus.COMPLIANT),
  ...range(8).map(() => AssetComplianceStatus.PENDING),
  ...range(5).map(() => AssetComplianceStatus.UNDER_REVIEW),
  ...range(2).map(() => AssetComplianceStatus.NON_COMPLIANT),
  ...range(1).map(() => AssetComplianceStatus.EXPIRED),
] as const;

export const notificationCategories = [
  NotificationCategory.SYSTEM,
  NotificationCategory.APPROVAL,
  NotificationCategory.WORKFLOW,
  NotificationCategory.COMPLIANCE,
] as const;

export const notificationSeverities = [
  NotificationSeverity.INFO,
  NotificationSeverity.WARNING,
  NotificationSeverity.CRITICAL,
] as const;

export const triggerActions = [
  TriggerActionType.START_WORKFLOW,
  TriggerActionType.CREATE_APPROVAL,
  TriggerActionType.START_AGENT_RUN,
  TriggerActionType.SEND_NOTIFICATION,
  TriggerActionType.NO_OP,
] as const;

export const observationTypes = [
  AgentObservationType.CONTEXT_GATHERED,
  AgentObservationType.METRIC_ANALYZED,
  AgentObservationType.ENTITY_EVALUATED,
  AgentObservationType.POLICY_CHECKED,
  AgentObservationType.EXTERNAL_SIGNAL,
] as const;

export const decisionTypes = [
  AgentDecisionType.SUMMARY,
  AgentDecisionType.RECOMMENDATION,
  AgentDecisionType.RISK_ASSESSMENT,
  AgentDecisionType.PRIORITIZATION,
  AgentDecisionType.ESCALATION_SUGGESTION,
] as const;

export const proposalStatuses = [
  AgentActionProposalStatus.PROPOSED,
  AgentActionProposalStatus.APPROVAL_REQUIRED,
  AgentActionProposalStatus.APPROVED,
  AgentActionProposalStatus.EXECUTED,
  AgentActionProposalStatus.REJECTED,
] as const;

export const riskLevels = [
  AgentRiskLevel.LOW,
  AgentRiskLevel.MEDIUM,
  AgentRiskLevel.HIGH,
  AgentRiskLevel.CRITICAL,
] as const;

export const confidenceLevels = [
  AgentConfidenceLevel.LOW,
  AgentConfidenceLevel.MEDIUM,
  AgentConfidenceLevel.HIGH,
] as const;

export const verificationTypes = [
  AgentVerificationType.EXECUTION,
  AgentVerificationType.STATE,
  AgentVerificationType.POLICY,
  AgentVerificationType.OUTCOME,
] as const;

export const verificationStatuses = [
  AgentVerificationStatus.PASSED,
  AgentVerificationStatus.PARTIAL,
  AgentVerificationStatus.FAILED,
] as const;

export const feedbackTypes = [
  AgentFeedbackType.USEFUL,
  AgentFeedbackType.NOT_USEFUL,
  AgentFeedbackType.OVERRIDE,
  AgentFeedbackType.CORRECTION,
  AgentFeedbackType.RATING,
] as const;

export const inferenceStatuses = [InferenceStatus.SUCCEEDED, InferenceStatus.FAILED] as const;
export const actorTypes = [DomainActorType.USER, DomainActorType.AGENT, DomainActorType.SYSTEM] as const;
export const processingStatuses = [
  DomainEventProcessingStatus.PROCESSED,
  DomainEventProcessingStatus.PUBLISHED,
  DomainEventProcessingStatus.FAILED,
] as const;
export const triggerExecutionStatuses = [
  TriggerExecutionStatus.SUCCEEDED,
  TriggerExecutionStatus.FAILED,
  TriggerExecutionStatus.DUPLICATE,
] as const;

export const workforceTypes = [
  WorkforceMemberType.EMPLOYEE,
  WorkforceMemberType.CONTRACTOR,
  WorkforceMemberType.TEMPORARY,
] as const;

export const employmentModels = [
  WorkforceEmploymentModel.FULL_TIME,
  WorkforceEmploymentModel.PART_TIME,
  WorkforceEmploymentModel.CONTRACT,
  WorkforceEmploymentModel.OUTSOURCED,
] as const;

export const credentialTypes = Object.values(CredentialDocumentType);
export const credentialStatuses = Object.values(CredentialVerificationStatus);
export const assetTypes = Object.values(AssetType);
export const maintenanceTypes = Object.values(AssetMaintenanceType);
export const maintenanceStatuses = Object.values(AssetMaintenanceStatus);
export const planTypes = Object.values(SchedulePlanType);
export const planStatuses = [SchedulePlanStatus.ACTIVE, SchedulePlanStatus.FINALIZED, SchedulePlanStatus.DRAFT] as const;
export const shiftTypes = Object.values(ShiftType);
export const priorities = Object.values(WorkOrderPriority);
export const assignmentTypes = Object.values(AssignmentType);
export const assignmentStatuses = Object.values(ResourceAssignmentStatus);
export const incidentActionTypes = Object.values(IncidentActionType);

export const toCurrencyAmount = (index: number): string => (150 + (index % 12) * 45).toFixed(2);
export const defaultStartedAt = (index: number): Date => addHours(subtractDays(DEMO_REFERENCE_DATE, index % 21), index % 6);
export const defaultOccurredAt = (index: number): Date => addHours(subtractDays(DEMO_REFERENCE_DATE, index % 14), index % 18);
export const normalizedDate = (date: Date): Date => startOfDay(date);
