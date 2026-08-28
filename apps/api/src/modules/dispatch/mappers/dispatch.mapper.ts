import {
  DispatchIncident,
  DispatchRun,
  DispatchShift,
  DispatchZone,
  DriverVehicleAssignment,
  Prisma,
} from '@prisma/client';

export const DISPATCH_ZONE_SELECT = {
  id: true,
  organizationId: true,
  code: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.DispatchZoneSelect;

export const DISPATCH_SHIFT_SELECT = {
  id: true,
  organizationId: true,
  code: true,
  title: true,
  description: true,
  zoneId: true,
  startsAt: true,
  endsAt: true,
  status: true,
  supervisorUserId: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.DispatchShiftSelect;

export const DRIVER_VEHICLE_ASSIGNMENT_SELECT = {
  id: true,
  organizationId: true,
  driverId: true,
  vehicleId: true,
  zoneId: true,
  shiftId: true,
  assignmentStatus: true,
  assignedAt: true,
  releasedAt: true,
  assignedByUserId: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.DriverVehicleAssignmentSelect;

export const DISPATCH_RUN_SELECT = {
  id: true,
  organizationId: true,
  assignmentId: true,
  zoneId: true,
  runCode: true,
  dispatchStatus: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.DispatchRunSelect;

export const DISPATCH_INCIDENT_SELECT = {
  id: true,
  organizationId: true,
  runId: true,
  assignmentId: true,
  incidentCode: true,
  incidentType: true,
  severity: true,
  title: true,
  description: true,
  status: true,
  reportedByUserId: true,
  reportedAt: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.DispatchIncidentSelect;

export type DispatchZoneResponse = Pick<
  DispatchZone,
  'id' | 'organizationId' | 'code' | 'name' | 'description' | 'isActive' | 'createdAt' | 'updatedAt'
>;

export type DispatchShiftResponse = Pick<
  DispatchShift,
  | 'id'
  | 'organizationId'
  | 'code'
  | 'title'
  | 'description'
  | 'zoneId'
  | 'startsAt'
  | 'endsAt'
  | 'status'
  | 'supervisorUserId'
  | 'createdAt'
  | 'updatedAt'
>;

export type DriverVehicleAssignmentResponse = Pick<
  DriverVehicleAssignment,
  | 'id'
  | 'organizationId'
  | 'driverId'
  | 'vehicleId'
  | 'zoneId'
  | 'shiftId'
  | 'assignmentStatus'
  | 'assignedAt'
  | 'releasedAt'
  | 'assignedByUserId'
  | 'notes'
  | 'createdAt'
  | 'updatedAt'
>;

export type DispatchRunResponse = Pick<
  DispatchRun,
  | 'id'
  | 'organizationId'
  | 'assignmentId'
  | 'zoneId'
  | 'runCode'
  | 'dispatchStatus'
  | 'startedAt'
  | 'completedAt'
  | 'cancelledAt'
  | 'createdAt'
  | 'updatedAt'
>;

export type DispatchIncidentResponse = Pick<
  DispatchIncident,
  | 'id'
  | 'organizationId'
  | 'runId'
  | 'assignmentId'
  | 'incidentCode'
  | 'incidentType'
  | 'severity'
  | 'title'
  | 'description'
  | 'status'
  | 'reportedByUserId'
  | 'reportedAt'
  | 'resolvedAt'
  | 'createdAt'
  | 'updatedAt'
>;

export const toDispatchZoneResponse = (zone: DispatchZoneResponse): DispatchZoneResponse => zone;
export const toDispatchShiftResponse = (shift: DispatchShiftResponse): DispatchShiftResponse =>
  shift;
export const toDriverVehicleAssignmentResponse = (
  assignment: DriverVehicleAssignmentResponse,
): DriverVehicleAssignmentResponse => assignment;
export const toDispatchRunResponse = (run: DispatchRunResponse): DispatchRunResponse => run;
export const toDispatchIncidentResponse = (
  incident: DispatchIncidentResponse,
): DispatchIncidentResponse => incident;
