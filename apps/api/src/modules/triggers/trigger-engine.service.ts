import { Injectable } from '@nestjs/common';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { DomainEventEnvelope } from '../events/domain-events.types';
import { TriggerExecutionService } from './trigger-execution.service';
import { TriggerRegistryService } from './trigger-registry.service';

@Injectable()
export class TriggerEngineService {
  constructor(
    private readonly triggerRegistryService: TriggerRegistryService,
    private readonly triggerExecutionService: TriggerExecutionService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async processDomainEvent(event: DomainEventEnvelope) {
    const candidateRules = await this.triggerRegistryService.getCandidateRules(event);

    if (candidateRules.length === 0) {
      return [];
    }

    const outcomes = [];
    for (const rule of candidateRules) {
      const outcome = await this.triggerExecutionService.execute(rule, event);
      outcomes.push(outcome);
    }

    this.logger.debug({
      event: 'trigger.engine.processed',
      domainEventId: event.id,
      eventType: event.eventType,
      triggeredRules: outcomes.length,
    });

    return outcomes;
  }
}
