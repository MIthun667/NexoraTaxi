import { Injectable } from '@nestjs/common';
import { TriggerRule } from '@prisma/client';

import { DomainEventEnvelope } from '../events/domain-events.types';
import { evaluateTriggerCondition, extractTriggerFieldValue } from './rules/trigger-condition.rule';
import { TriggerRepository } from './trigger.repository';
import { TriggerConditionConfig, TriggerConditionResult } from './triggers.types';

@Injectable()
export class TriggerEvaluatorService {
  constructor(private readonly triggerRepository: TriggerRepository) {}

  async evaluate(rule: TriggerRule, event: DomainEventEnvelope): Promise<TriggerConditionResult> {
    if (!rule.isEnabled) {
      return { matched: false, reason: 'Trigger is disabled.' };
    }

    if (rule.organizationId && event.organizationId && rule.organizationId !== event.organizationId) {
      return { matched: false, reason: 'Organization scope mismatch.' };
    }

    if (rule.aggregateType && rule.aggregateType !== event.aggregateType) {
      return { matched: false, reason: 'Aggregate type mismatch.' };
    }

    const conditionConfig = (rule.conditionConfig ?? null) as TriggerConditionConfig | null;
    if (!evaluateTriggerCondition(conditionConfig, event.payload)) {
      return { matched: false, reason: 'Condition config did not match event payload.' };
    }

    const dedupeKey = this.buildDedupeKey(rule, event);

    if (rule.cooldownSeconds && dedupeKey) {
      const startedAfter = new Date(Date.now() - rule.cooldownSeconds * 1000);
      const recentExecution = await this.triggerRepository.findRecentExecutionByDedupeKey({
        triggerRuleId: rule.id,
        organizationId: event.organizationId,
        dedupeKey,
        startedAfter,
      });

      if (recentExecution) {
        return {
          matched: true,
          dedupeKey,
          cooldownActive: true,
          reason: 'Trigger cooldown is active for the dedupe key.',
        };
      }
    }

    return { matched: true, dedupeKey };
  }

  private buildDedupeKey(rule: TriggerRule, event: DomainEventEnvelope) {
    const strategy = rule.dedupeKeyStrategy?.trim();

    if (!strategy || strategy === 'event-id') {
      return `${rule.id}:${event.id}`;
    }

    if (strategy === 'aggregate') {
      return `${rule.id}:${event.aggregateType}:${event.aggregateId ?? 'none'}`;
    }

    if (strategy.startsWith('payload:')) {
      const fieldPath = strategy.replace('payload:', '').trim();
      const fieldValue = extractTriggerFieldValue(event.payload, fieldPath);
      return `${rule.id}:${fieldPath}:${String(fieldValue ?? 'none')}`;
    }

    return `${rule.id}:${event.id}`;
  }
}
