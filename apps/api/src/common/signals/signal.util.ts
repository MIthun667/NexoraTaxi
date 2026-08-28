import { SignalCategory } from './signal-category.constants';
import { CanonicalSignal } from './signal.interface';
import { SignalSeverity } from './signal-severity.constants';
import { SignalStatus } from './signal-status.constants';

export interface CanonicalSignalInput {
  signalId?: string | null;
  signalType: string;
  signalCategory?: string | null;
  title: string;
  summary: string;
  severity?: string | null;
  status?: string | null;
  sourceModule?: string | null;
  sourceSystem?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  relatedEntityIds?: string[] | null;
  organizationId?: string | null;
  detectedAt?: Date | null;
  evidence?: Record<string, unknown> | null;
  metrics?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

const SIGNAL_CATEGORY_PREFIX_MAP: Array<{ prefix: string; category: string }> = [
  { prefix: 'people.', category: SignalCategory.people },
  { prefix: 'workforce.', category: SignalCategory.people },
  { prefix: 'workforce_', category: SignalCategory.people },
  { prefix: 'operator.', category: SignalCategory.people },
  { prefix: 'driver.', category: SignalCategory.people },
  { prefix: 'assets.', category: SignalCategory.assets },
  { prefix: 'asset.', category: SignalCategory.assets },
  { prefix: 'fleet.', category: SignalCategory.assets },
  { prefix: 'operations.', category: SignalCategory.operations },
  { prefix: 'work_order.', category: SignalCategory.operations },
  { prefix: 'dispatch.', category: SignalCategory.operations },
  { prefix: 'workflow.', category: SignalCategory.workflows },
  { prefix: 'approval.', category: SignalCategory.approvals },
  { prefix: 'compliance.', category: SignalCategory.compliance },
  { prefix: 'notification.', category: SignalCategory.notifications },
  { prefix: 'system.', category: SignalCategory.system },
];

export function inferSignalCategory(signalType: string) {
  return (
    SIGNAL_CATEGORY_PREFIX_MAP.find((entry) => signalType.startsWith(entry.prefix))?.category ??
    SignalCategory.system
  );
}

export function normalizeSignal(input: CanonicalSignalInput): CanonicalSignal {
  return {
    signalId: input.signalId ?? null,
    signalType: input.signalType,
    signalCategory: input.signalCategory ?? inferSignalCategory(input.signalType),
    title: input.title,
    summary: input.summary,
    severity: input.severity ?? SignalSeverity.medium,
    status: input.status ?? SignalStatus.open,
    sourceModule: input.sourceModule ?? null,
    sourceSystem: input.sourceSystem ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    relatedEntityIds: input.relatedEntityIds ?? null,
    organizationId: input.organizationId ?? null,
    detectedAt: input.detectedAt ?? new Date(),
    evidence: input.evidence ?? null,
    metrics: input.metrics ?? null,
    metadata: input.metadata ?? null,
  };
}

export function buildSignal(input: CanonicalSignalInput) {
  return normalizeSignal(input);
}
