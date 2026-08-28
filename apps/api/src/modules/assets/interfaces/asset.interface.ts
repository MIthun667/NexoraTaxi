/**
 * Asset is the universal read abstraction for operational resources owned or used
 * by an organization.
 *
 * The abstraction is intentionally industry-neutral so the platform can represent
 * vehicles today while remaining open to equipment, devices, facilities, and
 * future enterprise asset types without changing downstream consumers.
 */
export interface Asset {
  id: string;
  organizationId: string;
  displayName: string;
  assetType: string;
  status: string;
  sourceModule: 'assets' | 'fleet';
}
