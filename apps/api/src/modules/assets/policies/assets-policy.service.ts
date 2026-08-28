import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';

@Injectable()
export class AssetsPolicyService {
  assertSameOrganization(
    principalOrganizationId: string | null | undefined,
    resourceOrganizationId: string,
  ) {
    if (
      principalOrganizationId &&
      principalOrganizationId !== resourceOrganizationId
    ) {
      throw new ForbiddenException('Cross-organization asset access is not allowed.');
    }
  }

  assertCanCreate(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanUpdate(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanView(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanChangeStatus(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertCanManageMaintenance(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertSameOrganization(principal?.organizationId, organizationId);
  }

  assertExists<T>(value: T | null | undefined, message: string): asserts value is T {
    if (!value) {
      throw new NotFoundException(message);
    }
  }
}
