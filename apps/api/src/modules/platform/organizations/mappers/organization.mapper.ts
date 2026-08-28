import { Organization } from '@prisma/client';

export const ORGANIZATION_SELECT = {
  id: true,
  name: true,
  slug: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type OrganizationResponse = Pick<
  Organization,
  'id' | 'name' | 'slug' | 'status' | 'createdAt' | 'updatedAt'
>;

export const toOrganizationResponse = (
  organization: OrganizationResponse,
): OrganizationResponse => organization;
