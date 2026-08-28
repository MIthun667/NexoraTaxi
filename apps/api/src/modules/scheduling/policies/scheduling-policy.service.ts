import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleShiftStatus } from '@prisma/client';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';

@Injectable()
export class SchedulingPolicyService {
  assertSameOrganization(
    principalOrganizationId: string | null | undefined,
    resourceOrganizationId: string,
  ) {
    if (principalOrganizationId && principalOrganizationId !== resourceOrganizationId) {
      throw new ForbiddenException('Cross-organization scheduling access is not allowed.');
    }
  }

  assertCanManagePlans(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanViewPlans(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanManageShifts(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanViewShifts(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanUpdateCapacity(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanChangeShiftStatus(
    principal: CurrentPrincipal | undefined,
    organizationId: string,
    currentStatus: ScheduleShiftStatus,
    nextStatus: ScheduleShiftStatus,
  ) {
    this.assertSameOrganization(principal?.organizationId, organizationId);

    if (
      currentStatus === ScheduleShiftStatus.COMPLETED &&
      nextStatus !== ScheduleShiftStatus.COMPLETED
    ) {
      throw new ForbiddenException('Completed shifts cannot transition backwards.');
    }
  }

  assertExists<T>(value: T | null | undefined, message: string): asserts value is T {
    if (!value) {
      throw new NotFoundException(message);
    }
  }
}
