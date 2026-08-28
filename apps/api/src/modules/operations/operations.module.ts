import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { OperationalZonesController } from './operational-zones.controller';
import { OperationalZonesRepository } from './operational-zones.repository';
import { OperationalZonesService } from './operational-zones.service';
import { OperationsPolicyService } from './policies/operations-policy.service';
import { WorkOrderStatusService } from './work-order-status.service';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersQueryService } from './work-orders-query.service';
import { WorkOrdersRepository } from './work-orders.repository';
import { WorkOrdersService } from './work-orders.service';
import { OperationsService } from './operations.service';

@Module({
  imports: [AuditModule, DispatchModule],
  controllers: [OperationalZonesController, WorkOrdersController],
  providers: [
    OperationsService,
    OperationalZonesRepository,
    WorkOrdersRepository,
    OperationalZonesService,
    WorkOrdersService,
    WorkOrdersQueryService,
    WorkOrderStatusService,
    OperationsPolicyService,
  ],
  exports: [
    OperationsService,
    OperationalZonesService,
    WorkOrdersService,
    WorkOrdersQueryService,
    WorkOrderStatusService,
  ],
})
export class OperationsModule {}
