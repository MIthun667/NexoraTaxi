import { CanonicalPlatformEvent } from './canonical-event.interface';
import {
  CANONICAL_EVENT_PREFIX_RULES,
  LEGACY_ENTITY_TYPE_MAP,
  LEGACY_EVENT_NORMALIZATION_RULES,
} from './event-name-map';
import { PlatformEventCategory } from './event-category.constants';

export interface CanonicalEventInput {
  eventId?: string | null;
  eventType: string;
  aggregateType: string;
  aggregateId?: string | null;
  organizationId?: string | null;
  sourceModule?: string | null;
  actorType?: string | null;
  actorId?: string | null;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  occurredAt?: Date;
}

export function getLegacyEventNameMap() {
  return LEGACY_EVENT_NORMALIZATION_RULES;
}

export function normalizeEventName(eventType: string) {
  for (const rule of LEGACY_EVENT_NORMALIZATION_RULES) {
    if (eventType.startsWith(rule.legacyPrefix)) {
      return {
        canonicalEventType: `${rule.canonicalPrefix}${eventType.slice(rule.legacyPrefix.length)}`,
        category: rule.category,
        legacyEventType: eventType,
        rule,
      };
    }
  }

  for (const rule of CANONICAL_EVENT_PREFIX_RULES) {
    if (eventType.startsWith(rule.prefix)) {
      return {
        canonicalEventType: eventType,
        category: rule.category,
        legacyEventType: null,
        rule: null,
      };
    }
  }

  return {
    canonicalEventType: eventType,
    category: PlatformEventCategory.system,
    legacyEventType: null,
    rule: null,
  };
}

export function normalizeEntityType(aggregateType: string) {
  return LEGACY_ENTITY_TYPE_MAP[aggregateType] ?? aggregateType;
}

export function buildCanonicalEvent(input: CanonicalEventInput): CanonicalPlatformEvent {
  const normalized = normalizeEventName(input.eventType);

  return {
    eventId: input.eventId ?? null,
    eventType: input.eventType,
    canonicalEventType: normalized.canonicalEventType,
    eventCategory: normalized.category,
    occurredAt: input.occurredAt ?? new Date(),
    organizationId: input.organizationId ?? null,
    sourceModule: input.sourceModule ?? null,
    entityType: normalizeEntityType(input.aggregateType),
    entityId: input.aggregateId ?? null,
    actorType: input.actorType ?? null,
    actorId: input.actorId ?? null,
    payload: input.payload ?? {},
    metadata: input.metadata ?? null,
    legacyEventType: normalized.legacyEventType,
  };
}
