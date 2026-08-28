export interface CanonicalPlatformEvent {
  eventId?: string | null;
  eventType: string;
  canonicalEventType: string;
  eventCategory: string;
  occurredAt: Date;
  organizationId?: string | null;
  sourceModule?: string | null;
  entityType: string;
  entityId?: string | null;
  actorType?: string | null;
  actorId?: string | null;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  legacyEventType?: string | null;
}
