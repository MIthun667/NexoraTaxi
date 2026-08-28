import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { DomainEventsService } from '../notifications/domain-events.service';
import { TenancyRepository } from './tenancy.repository';
import { RecordBillingEventInput } from './tenancy.types';

@Injectable()
export class BillingService {
  constructor(
    private readonly tenancyRepository: TenancyRepository,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async recordBillingEvent(input: RecordBillingEventInput) {
    const event = await this.tenancyRepository.createBillingEvent({
      organizationId: input.organizationId,
      subscriptionId: input.subscriptionId ?? null,
      eventType: input.eventType,
      summary: input.summary,
      metadata: (input.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    });

    await this.domainEventsService.publish({
      organizationId: input.organizationId,
      eventType: `billing.${String(input.eventType).toLowerCase()}`,
      aggregateType: 'organization-billing-event',
      aggregateId: event.id,
      payload: {
        subscriptionId: input.subscriptionId ?? null,
        summary: input.summary,
        metadata: input.metadata ?? null,
      },
    });

    return event;
  }
}
