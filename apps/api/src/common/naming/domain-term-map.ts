export interface DomainTermMappingEntry {
  legacyTerm: string;
  preferredUniversalTerm: string;
  notes: string;
  externallyExposed: boolean;
}

/**
 * Canonical legacy-to-universal vocabulary registry.
 *
 * This is a compatibility map, not a global replacement mechanism. It documents
 * the preferred business language while taxi-era routes, DTOs, and Prisma model
 * names remain intact during the transition to a universal company OS.
 */
export const DOMAIN_TERM_MAP: DomainTermMappingEntry[] = [
  {
    legacyTerm: 'driver',
    preferredUniversalTerm: 'person / workforce member',
    notes:
      'Use people/workforce language for new abstractions while keeping driver APIs compatible.',
    externallyExposed: true,
  },
  {
    legacyTerm: 'driver status',
    preferredUniversalTerm: 'person status / workforce status',
    notes:
      'Prefer operational, compliance, or availability status categories over role-specific status terms.',
    externallyExposed: true,
  },
  {
    legacyTerm: 'fleet vehicle',
    preferredUniversalTerm: 'asset',
    notes:
      'Vehicles are an asset subtype; new read models should normalize to asset terminology.',
    externallyExposed: true,
  },
  {
    legacyTerm: 'fleet maintenance',
    preferredUniversalTerm: 'asset maintenance',
    notes:
      'Maintenance capability should be described as asset-centric rather than vehicle-only.',
    externallyExposed: true,
  },
  {
    legacyTerm: 'dispatch',
    preferredUniversalTerm: 'operations / operational task coordination',
    notes:
      'Use operations language for cross-industry work coordination while dispatch remains a legacy compatibility surface.',
    externallyExposed: true,
  },
  {
    legacyTerm: 'dispatch run',
    preferredUniversalTerm: 'operational task',
    notes:
      'Dispatch run records should be projected into task-oriented language for universal consumers.',
    externallyExposed: true,
  },
  {
    legacyTerm: 'trip / job / run',
    preferredUniversalTerm: 'operational task',
    notes:
      'Task/work-unit terminology is the preferred generic description for coordinated work.',
    externallyExposed: false,
  },
  {
    legacyTerm: 'ride assignment / driver vehicle assignment',
    preferredUniversalTerm: 'assignment / resource assignment',
    notes:
      'Assignments should remain generic enough to support people, assets, shifts, and work units.',
    externallyExposed: true,
  },
  {
    legacyTerm: 'operator',
    preferredUniversalTerm: 'person / worker',
    notes:
      'Operator can remain a role label, but person/workforce is the preferred platform abstraction.',
    externallyExposed: true,
  },
];
