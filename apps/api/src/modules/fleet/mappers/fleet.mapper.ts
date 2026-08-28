import {
  FleetMaintenanceRecord,
  FleetStatusHistory,
  FleetVehicle,
  Prisma,
} from '@prisma/client';

export const FLEET_VEHICLE_SELECT = {
  id: true,
  organizationId: true,
  vehicleCode: true,
  plateNumber: true,
  vin: true,
  make: true,
  model: true,
  modelYear: true,
  color: true,
  vehicleClass: true,
  registrationNumber: true,
  registrationIssuedAt: true,
  registrationExpiresAt: true,
  insurancePolicyNumber: true,
  insuranceExpiresAt: true,
  onboardingStatus: true,
  operationalStatus: true,
  complianceStatus: true,
  assignmentStatus: true,
  joinedAt: true,
  decommissionedAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FleetVehicleSelect;

export type FleetVehicleResponse = Pick<
  FleetVehicle,
  | 'id'
  | 'organizationId'
  | 'vehicleCode'
  | 'plateNumber'
  | 'vin'
  | 'make'
  | 'model'
  | 'modelYear'
  | 'color'
  | 'vehicleClass'
  | 'registrationNumber'
  | 'registrationIssuedAt'
  | 'registrationExpiresAt'
  | 'insurancePolicyNumber'
  | 'insuranceExpiresAt'
  | 'onboardingStatus'
  | 'operationalStatus'
  | 'complianceStatus'
  | 'assignmentStatus'
  | 'joinedAt'
  | 'decommissionedAt'
  | 'createdAt'
  | 'updatedAt'
> & {
  isDispatchReady: boolean;
};

export const FLEET_MAINTENANCE_SELECT = {
  id: true,
  vehicleId: true,
  maintenanceType: true,
  title: true,
  description: true,
  scheduledAt: true,
  completedAt: true,
  status: true,
  vendorName: true,
  costAmount: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FleetMaintenanceRecordSelect;

export type FleetMaintenanceRecordResponse = Pick<
  FleetMaintenanceRecord,
  | 'id'
  | 'vehicleId'
  | 'maintenanceType'
  | 'title'
  | 'description'
  | 'scheduledAt'
  | 'completedAt'
  | 'status'
  | 'vendorName'
  | 'costAmount'
  | 'notes'
  | 'createdAt'
  | 'updatedAt'
>;

export const FLEET_STATUS_HISTORY_SELECT = {
  id: true,
  vehicleId: true,
  statusCategory: true,
  previousValue: true,
  newValue: true,
  changedByUserId: true,
  reason: true,
  createdAt: true,
} as const satisfies Prisma.FleetStatusHistorySelect;

export type FleetStatusHistoryResponse = Pick<
  FleetStatusHistory,
  | 'id'
  | 'vehicleId'
  | 'statusCategory'
  | 'previousValue'
  | 'newValue'
  | 'changedByUserId'
  | 'reason'
  | 'createdAt'
>;

export const toFleetVehicleResponse = (
  vehicle: Omit<FleetVehicleResponse, 'isDispatchReady'>,
  isDispatchReady: boolean,
): FleetVehicleResponse => ({
  ...vehicle,
  isDispatchReady,
});

export const toFleetMaintenanceRecordResponse = (
  record: FleetMaintenanceRecordResponse,
): FleetMaintenanceRecordResponse => record;

export const toFleetStatusHistoryResponse = (
  entry: FleetStatusHistoryResponse,
): FleetStatusHistoryResponse => entry;
