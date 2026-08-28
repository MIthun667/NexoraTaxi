import type { OrganizationStatus, PrismaClient } from '@prisma/client';

export const createSeedOrganization = async (
  prisma: PrismaClient,
  input: { id: string; name: string; slug: string; status: OrganizationStatus },
) =>
  prisma.organization.create({
    data: {
      id: input.id,
      name: input.name,
      slug: input.slug,
      status: input.status,
    },
  });
