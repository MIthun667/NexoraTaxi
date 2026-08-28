import { PlatformEventCategory } from './event-category.constants';

export interface LegacyEventNormalizationRule {
  legacyPrefix: string;
  canonicalPrefix: string;
  category: string;
  notes: string;
  externallyExposed: boolean;
}

export const LEGACY_EVENT_NORMALIZATION_RULES: LegacyEventNormalizationRule[] = [
  {
    legacyPrefix: 'driver.',
    canonicalPrefix: 'people.',
    category: PlatformEventCategory.people,
    notes: 'Legacy taxi-era driver events should converge on universal people/workforce language.',
    externallyExposed: true,
  },
  {
    legacyPrefix: 'operator.',
    canonicalPrefix: 'people.',
    category: PlatformEventCategory.people,
    notes: 'Operator is currently the transitional event vocabulary for taxi-era driver concepts.',
    externallyExposed: true,
  },
  {
    legacyPrefix: 'fleet.',
    canonicalPrefix: 'assets.',
    category: PlatformEventCategory.assets,
    notes: 'Fleet-specific event vocabulary should converge on universal asset language.',
    externallyExposed: true,
  },
  {
    legacyPrefix: 'dispatch.',
    canonicalPrefix: 'operations.',
    category: PlatformEventCategory.operations,
    notes: 'Dispatch-specific events should converge on universal operations language.',
    externallyExposed: true,
  },
];

export const CANONICAL_EVENT_PREFIX_RULES = [
  {
    prefix: 'people.',
    category: PlatformEventCategory.people,
  },
  {
    prefix: 'workforce_',
    category: PlatformEventCategory.people,
  },
  {
    prefix: 'credential_',
    category: PlatformEventCategory.people,
  },
  {
    prefix: 'asset.',
    category: PlatformEventCategory.assets,
  },
  {
    prefix: 'assets.',
    category: PlatformEventCategory.assets,
  },
  {
    prefix: 'operations.',
    category: PlatformEventCategory.operations,
  },
  {
    prefix: 'work_order.',
    category: PlatformEventCategory.operations,
  },
  {
    prefix: 'operational_zone.',
    category: PlatformEventCategory.operations,
  },
  {
    prefix: 'resource_assignment.',
    category: PlatformEventCategory.operations,
  },
  {
    prefix: 'schedule_',
    category: PlatformEventCategory.operations,
  },
  {
    prefix: 'approval.',
    category: PlatformEventCategory.approvals,
  },
  {
    prefix: 'workflow.',
    category: PlatformEventCategory.workflows,
  },
  {
    prefix: 'notification.',
    category: PlatformEventCategory.notifications,
  },
  {
    prefix: 'trigger.',
    category: PlatformEventCategory.intelligence,
  },
  {
    prefix: 'agent.',
    category: PlatformEventCategory.intelligence,
  },
  {
    prefix: 'decision_report.',
    category: PlatformEventCategory.intelligence,
  },
];

export const LEGACY_ENTITY_TYPE_MAP: Record<string, string> = {
  driver: 'person',
  operator: 'person',
  workforce_member: 'person',
  'workforce-member': 'person',
  fleet: 'asset',
  vehicle: 'asset',
  'fleet-vehicle': 'asset',
  asset: 'asset',
  dispatch: 'operational-task',
  'dispatch-run': 'operational-task',
  'dispatch-issue': 'incident',
  'resource-assignment': 'assignment',
  'work-order': 'operational-task',
  work_order: 'operational-task',
  approval: 'approval',
  workflow: 'workflow',
};
