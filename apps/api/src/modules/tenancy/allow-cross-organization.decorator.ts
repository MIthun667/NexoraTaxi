import { SetMetadata } from '@nestjs/common';

export const ALLOW_CROSS_ORGANIZATION_KEY = 'allowCrossOrganization';
export const CROSS_ORGANIZATION_PERMISSION = 'platform.organization.cross_scope';

/**
 * Explicitly opts a route into cross-organization requests. The global
 * TenantGuard still requires the caller to hold CROSS_ORGANIZATION_PERMISSION.
 */
export const AllowCrossOrganization = () => SetMetadata(ALLOW_CROSS_ORGANIZATION_KEY, true);
