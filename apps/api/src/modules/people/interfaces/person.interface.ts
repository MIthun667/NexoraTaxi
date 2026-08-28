/**
 * Person is the universal read model for human operational actors in the platform.
 *
 * This abstraction intentionally sits above taxi-era and universal modules so callers can
 * consume a stable person shape while the platform evolves from driver/operator-specific
 * records toward a broader company-wide people model.
 */
export interface Person {
  id: string;
  organizationId: string;
  displayName: string;
  roleCategory: 'employee' | 'driver' | 'operator' | 'manager' | 'worker';
  status: string;
  sourceModule: 'workforce' | 'drivers';
}
