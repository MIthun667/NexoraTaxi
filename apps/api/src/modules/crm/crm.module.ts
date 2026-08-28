import { Module } from '@nestjs/common';

import { CrmController } from './crm.controller';
import { CrmCustomerIntelligenceService } from './crm-customer-intelligence.service';
import { CrmCustomerProfileService } from './crm-customer-profile.service';

@Module({
  controllers: [CrmController],
  providers: [CrmCustomerProfileService, CrmCustomerIntelligenceService],
  exports: [CrmCustomerProfileService, CrmCustomerIntelligenceService],
})
export class CrmModule {}
