import { Injectable } from '@nestjs/common';
import { OrganizationLifecycleStatus, OrganizationStatus, UserStatus } from '@prisma/client';

import { SubscriptionService } from './subscription.service';
import { TenancyRepository } from './tenancy.repository';
import { ProvisionOrganizationInput } from './tenancy.types';

@Injectable()
export class OrganizationProvisioningService {
  constructor(
    private readonly tenancyRepository: TenancyRepository,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async provision(input: ProvisionOrganizationInput) {
    const { organization, user } = await this.tenancyRepository.createOrganizationWithAdmin({
      organization: {
        name: input.organizationName,
        slug: input.organizationSlug,
        status: OrganizationStatus.ACTIVE,
        lifecycleStatus: OrganizationLifecycleStatus.TRIAL,
      },
      user: {
        email: input.adminEmail,
        firstName: input.adminFirstName,
        lastName: input.adminLastName,
        passwordHash: input.passwordHash,
        status: UserStatus.ACTIVE,
      },
    });

    const subscription = await this.subscriptionService.assignPlan({
      organizationId: organization.id,
      planCode: 'trial',
      trialDays: 14,
    });

    return {
      organization,
      adminUser: user,
      subscription,
      demoDataRecommended: input.generateDemoData ?? true,
    };
  }
}
