import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';

@Injectable()
export class OperationsPolicyService {
  assertSameOrganization(
    principalOrganizationId: string | null | undefined,
    resourceOrganizationId: string,
  ) {
    if (
      principalOrganizationId &&
      principalOrganizationId !== resourceOrganizationId
    ) {
      throw new ForbiddenException('Cross-organization operations access is not allowed.');
    }
  }

  assertCanManageZones(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanViewZones(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanManageWorkOrders(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanViewWorkOrders(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanTransitionWorkOrder(
    principal: CurrentPrincipal | undefined,
    organizationId: string,
    currentStatus: WorkOrderStatus,
    nextStatus: WorkOrderStatus,
  ) {
    this.assertSameOrganization(principal?.organizationId, organizationId);

    if (currentStatus === WorkOrderStatus.COMPLETED && nextStatus !== WorkOrderStatus.COMPLETED) {
      throw new ForbiddenException('Completed work orders cannot transition backwards.');
    }
  }

  assertExists<T>(value: T | null | undefined, message: string): asserts value is T {
    if (!value) {
      throw new NotFoundException(message);
    }
  }
}
