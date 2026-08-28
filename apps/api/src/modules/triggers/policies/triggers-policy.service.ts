import { ForbiddenException, Injectable } from '@nestjs/common';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';

@Injectable()
export class TriggersPolicyService {
  assertSameOrganization(organizationId: string | null | undefined, principal?: CurrentPrincipal) {
    if (!organizationId || !principal?.organizationId) {
      return;
    }

    if (organizationId !== principal.organizationId) {
      throw new ForbiddenException('Cross-organization trigger access is not permitted.');
    }
  }

  assertEventScope(ruleOrganizationId: string | null | undefined, eventOrganizationId: string | null | undefined) {
    if (ruleOrganizationId && eventOrganizationId && ruleOrganizationId !== eventOrganizationId) {
      throw new ForbiddenException('Trigger rule organization does not match the domain event organization.');
    }
  }
}
