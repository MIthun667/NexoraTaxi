import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class GovernancePolicyService {
  assertOrganizationScope(principalOrganizationId: string | null | undefined, targetOrganizationId: string) {
    if (principalOrganizationId && principalOrganizationId !== targetOrganizationId) {
      throw new NotFoundException('Governance record not found.');
    }
  }
}
