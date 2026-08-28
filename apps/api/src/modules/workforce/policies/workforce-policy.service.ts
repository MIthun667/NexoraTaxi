import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';

@Injectable()
export class WorkforcePolicyService {
  assertSameOrganization(
    principal: CurrentPrincipal | undefined,
    organizationId: string | null | undefined,
  ) {
    if (!organizationId || !principal) {
      return;
    }

    if (principal.organizationId !== organizationId) {
      throw new ForbiddenException('Cross-organization access is not allowed.');
    }
  }

  assertCanCreate(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertAuthenticated(principal);
    this.assertSameOrganization(principal, organizationId);
  }

  assertCanUpdate(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertAuthenticated(principal);
    this.assertSameOrganization(principal, organizationId);
  }

  assertCanView(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertAuthenticated(principal);
    this.assertSameOrganization(principal, organizationId);
  }

  assertCanVerifyCredential(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertAuthenticated(principal);
    this.assertSameOrganization(principal, organizationId);
  }

  assertCanChangeStatus(principal: CurrentPrincipal | undefined, organizationId: string) {
    this.assertAuthenticated(principal);
    this.assertSameOrganization(principal, organizationId);
  }

  assertExists<T>(value: T | null | undefined, message: string): asserts value is T {
    if (!value) {
      throw new NotFoundException(message);
    }
  }

  private assertAuthenticated(principal: CurrentPrincipal | undefined) {
    if (!principal) {
      throw new ForbiddenException('Authenticated principal is required.');
    }
  }
}
