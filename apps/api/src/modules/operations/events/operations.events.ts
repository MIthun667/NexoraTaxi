import {
  OperationalZoneType,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@prisma/client';

import { DomainEventPayload } from '../../events/domain-events.types';

export const OperationsEvents = {
  zoneCreated: 'operational_zone.created',
  zoneUpdated: 'operational_zone.updated',
  workOrderCreated: 'work_order.created',
  workOrderUpdated: 'work_order.updated',
  workOrderStatusChanged: 'work_order.status_changed',
  workOrderBlocked: 'work_order.blocked',
  workOrderCompleted: 'work_order.completed',
} as const;

export interface OperationalZoneCreatedEventPayload extends DomainEventPayload {
  operationalZoneId: string;
  organizationId: string;
  zoneCode: string;
  zoneType: OperationalZoneType;
  parentZoneId?: string | null;
}

export interface OperationalZoneUpdatedEventPayload extends DomainEventPayload {
  operationalZoneId: string;
  organizationId: string;
  changedFields: string[];
}

export interface WorkOrderCreatedEventPayload extends DomainEventPayload {
  workOrderId: string;
  organizationId: string;
  workOrderCode: string;
  workType: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  zoneId?: string | null;
}

export interface WorkOrderUpdatedEventPayload extends DomainEventPayload {
  workOrderId: string;
  organizationId: string;
  changedFields: string[];
}

export interface WorkOrderStatusChangedEventPayload extends DomainEventPayload {
  workOrderId: string;
  organizationId: string;
  previousStatus: WorkOrderStatus;
  nextStatus: WorkOrderStatus;
  reason?: string | null;
  changedByUserId?: string | null;
}
