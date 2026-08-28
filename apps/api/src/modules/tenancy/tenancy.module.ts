import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BillingService } from './billing.service';
import { OrganizationProvisioningService } from './organization-provisioning.service';
import { PlanEnforcementService } from './plan-enforcement.service';
import { SubscriptionService } from './subscription.service';
import { TenantGuard } from './tenant-guard';
import { TenancyRepository } from './tenancy.repository';
import { UsageMeterService } from './usage-meter.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [
    TenancyRepository,
    BillingService,
    SubscriptionService,
    UsageMeterService,
    PlanEnforcementService,
    OrganizationProvisioningService,
    TenantGuard,
  ],
  exports: [
    BillingService,
    SubscriptionService,
    UsageMeterService,
    PlanEnforcementService,
    OrganizationProvisioningService,
    TenantGuard,
  ],
})
export class TenancyModule {}
