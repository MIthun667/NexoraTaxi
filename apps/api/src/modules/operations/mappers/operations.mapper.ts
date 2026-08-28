import { OperationalZone, WorkOrder } from '@prisma/client';

export const OPERATIONAL_ZONE_SELECT = {
  id: true,
  organizationId: true,
  zoneCode: true,
  name: true,
  zoneType: true,
  description: true,
  parentZoneId: true,
  coverageDefinition: true,
  isActive: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const WORK_ORDER_SELECT = {
  id: true,
  organizationId: true,
  workOrderCode: true,
  title: true,
  description: true,
  workType: true,
  status: true,
  priority: true,
  zoneId: true,
  createdByUserId: true,
  requestedAt: true,
  scheduledStartAt: true,
  scheduledEndAt: true,
  actualStartAt: true,
  actualEndAt: true,
  sourceType: true,
  sourceId: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type OperationalZoneResponse = Pick<
  OperationalZone,
  | 'id'
  | 'organizationId'
  | 'zoneCode'
  | 'name'
  | 'zoneType'
  | 'description'
  | 'parentZoneId'
  | 'coverageDefinition'
  | 'isActive'
  | 'metadata'
  | 'createdAt'
  | 'updatedAt'
>;

export type WorkOrderResponse = Pick<
  WorkOrder,
  | 'id'
  | 'organizationId'
  | 'workOrderCode'
  | 'title'
  | 'description'
  | 'workType'
  | 'status'
  | 'priority'
  | 'zoneId'
  | 'createdByUserId'
  | 'requestedAt'
  | 'scheduledStartAt'
  | 'scheduledEndAt'
  | 'actualStartAt'
  | 'actualEndAt'
  | 'sourceType'
  | 'sourceId'
  | 'metadata'
  | 'createdAt'
  | 'updatedAt'
>;

export const toOperationalZoneResponse = (
  zone: OperationalZoneResponse,
): OperationalZoneResponse => zone;
export const toWorkOrderResponse = (workOrder: WorkOrderResponse): WorkOrderResponse => workOrder;
