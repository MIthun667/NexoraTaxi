import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { ListAssetsQueryDto } from '../dto/list-assets-query.dto';

export function buildAssetsListWhere(
  query: ListAssetsQueryDto,
  principal?: CurrentPrincipal,
): Prisma.AssetWhereInput {
  const search = query.search?.trim();
  const organizationId = query.organizationId ?? principal?.organizationId;

  return {
    deletedAt: null,
    ...(organizationId ? { organizationId } : {}),
    ...(query.assetType ? { assetType: query.assetType } : {}),
    ...(query.assetClass ? { assetClass: { equals: query.assetClass.trim(), mode: 'insensitive' } } : {}),
    ...(query.operationalStatus ? { operationalStatus: query.operationalStatus } : {}),
    ...(query.complianceStatus ? { complianceStatus: query.complianceStatus } : {}),
    ...(query.availabilityStatus ? { availabilityStatus: query.availabilityStatus } : {}),
    ...(query.zoneId ? { zoneId: query.zoneId } : {}),
    ...(query.ownerOrganizationId ? { ownerOrganizationId: query.ownerOrganizationId } : {}),
    ...(search
      ? {
          OR: [
            { assetCode: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { assetClass: { contains: search, mode: 'insensitive' } },
            { serialNumber: { contains: search, mode: 'insensitive' } },
            { registrationNumber: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}
