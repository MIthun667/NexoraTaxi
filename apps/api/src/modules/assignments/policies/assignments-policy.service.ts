import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ResourceAssignmentStatus } from '@prisma/client';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';

@Injectable()
export class AssignmentsPolicyService {
  assertSameOrganization(
    principalOrganizationId: string | null | undefined,
    resourceOrganizationId: string,
  ) {
    if (principalOrganizationId && principalOrganizationId !== resourceOrganizationId) {
      throw new ForbiddenException('Cross-organization assignment access is not allowed.');
    }
  }

  assertCanManageAssignments(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanViewAssignments(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanTransitionAssignment(
    principal: CurrentPrincipal | undefined,
    organizationId: string,
    currentStatus: ResourceAssignmentStatus,
    nextStatus: ResourceAssignmentStatus,
  ) {
    this.assertSameOrganization(principal?.organizationId, organizationId);

    if (
      currentStatus === ResourceAssignmentStatus.RELEASED &&
      nextStatus !== ResourceAssignmentStatus.RELEASED
    ) {
      throw new ForbiddenException('Released assignments cannot transition backwards.');
    }
  }

  assertExists<T>(value: T | null | undefined, message: string): asserts value is T {
    if (!value) {
      throw new NotFoundException(message);
    }
  }
}
