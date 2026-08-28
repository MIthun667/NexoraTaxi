import { Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class ConnectorPolicyService {
  assertOrganizationScope(instanceOrganizationId: string | null, organizationId: string) {
    if (instanceOrganizationId && instanceOrganizationId !== organizationId) {
      throw new ForbiddenException('Cross-organization connector execution is not permitted.');
    }
  }

  assertOutboundActionAllowed(actionType: string, payload?: Record<string, unknown> | null) {
    const restrictedTargets = ['finance', 'payment'];
    const targetRef = String(payload?.targetRef ?? payload?.channel ?? '').toLowerCase();
    if (restrictedTargets.some((token) => targetRef.includes(token)) && actionType !== 'SEND_NOTIFICATION') {
      throw new ForbiddenException('This outbound connector action is restricted by policy.');
    }
  }
}
