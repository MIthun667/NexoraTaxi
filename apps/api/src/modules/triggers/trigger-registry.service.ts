import { Injectable } from '@nestjs/common';

import { DomainEventEnvelope } from '../events/domain-events.types';
import { TriggerRepository } from './trigger.repository';

@Injectable()
export class TriggerRegistryService {
  constructor(private readonly triggerRepository: TriggerRepository) {}

  getCandidateRules(event: DomainEventEnvelope) {
    return this.triggerRepository.findCandidateRules(
      event.organizationId,
      event.eventType,
      event.aggregateType,
    );
  }
}
