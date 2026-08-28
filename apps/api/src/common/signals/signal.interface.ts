export interface CanonicalSignal {
  signalId?: string | null;
  signalType: string;
  signalCategory: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  sourceModule?: string | null;
  sourceSystem?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  relatedEntityIds?: string[] | null;
  organizationId?: string | null;
  detectedAt: Date;
  evidence?: Record<string, unknown> | null;
  metrics?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}
