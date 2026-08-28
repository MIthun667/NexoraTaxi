import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Organization, OrganizationStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../../shared/responses/response.util';
import { AuditService } from '../../audit/audit.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {
  ORGANIZATION_SELECT,
  OrganizationResponse,
  toOrganizationResponse,
} from './mappers/organization.mapper';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto) {
    await this.ensureSlugIsAvailable(createOrganizationDto.slug);

    const organization = await this.prismaService.organization.create({
      data: {
        name: createOrganizationDto.name,
        slug: createOrganizationDto.slug,
        status: createOrganizationDto.status ?? OrganizationStatus.ACTIVE,
      },
      select: ORGANIZATION_SELECT,
    });

    return buildSuccessResponse(
      'Organization created successfully.',
      toOrganizationResponse(organization),
    );
  }

  async findAll(query: QueryOrganizationsDto) {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();

    const where: Prisma.OrganizationWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                slug: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [organizations, total] = await this.prismaService.$transaction([
      this.prismaService.organization.findMany({
        where,
        select: ORGANIZATION_SELECT,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.organization.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Organizations retrieved successfully.',
      organizations.map((organization) => toOrganizationResponse(organization)),
      buildPaginationMeta({
        page,
        limit,
        total,
      }),
    );
  }

  async findOne(id: string) {
    const organization = await this.findActiveOrganizationById(id);

    return buildSuccessResponse(
      'Organization profile retrieved successfully.',
      toOrganizationResponse(organization),
    );
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto) {
    if (Object.keys(updateOrganizationDto).length === 0) {
      throw new BadRequestException('At least one organization field must be provided for update.');
    }

    const existingOrganization = await this.findActiveOrganizationById(id);

    if (
      updateOrganizationDto.slug &&
      updateOrganizationDto.slug !== existingOrganization.slug
    ) {
      await this.ensureSlugIsAvailable(updateOrganizationDto.slug, id);
    }

    const organization = await this.prismaService.organization.update({
      where: { id },
      data: {
        ...(updateOrganizationDto.name !== undefined ? { name: updateOrganizationDto.name } : {}),
        ...(updateOrganizationDto.slug !== undefined ? { slug: updateOrganizationDto.slug } : {}),
        ...(updateOrganizationDto.status !== undefined
          ? { status: updateOrganizationDto.status }
          : {}),
      },
      select: ORGANIZATION_SELECT,
    });

    await this.auditService.record({
      action: 'organization.update',
      entityType: 'organization',
      entityId: organization.id,
      organizationId: organization.id,
      summary: `Organization ${organization.name} was updated.`,
      metadata: updateOrganizationDto as Prisma.InputJsonValue,
    });

    return buildSuccessResponse(
      'Organization updated successfully.',
      toOrganizationResponse(organization),
    );
  }

  async archive(id: string) {
    await this.findActiveOrganizationById(id);

    const organization = await this.prismaService.organization.update({
      where: { id },
      data: {
        status: OrganizationStatus.ARCHIVED,
        deletedAt: new Date(),
      },
      select: ORGANIZATION_SELECT,
    });

    await this.auditService.record({
      action: 'organization.archive',
      entityType: 'organization',
      entityId: organization.id,
      organizationId: organization.id,
      summary: `Organization ${organization.name} was archived.`,
    });

    return buildSuccessResponse(
      'Organization archived successfully.',
      toOrganizationResponse(organization),
    );
  }

  private async ensureSlugIsAvailable(slug: string, organizationIdToExclude?: string) {
    const existingOrganization = await this.prismaService.organization.findFirst({
      where: {
        slug,
        ...(organizationIdToExclude ? { id: { not: organizationIdToExclude } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (existingOrganization) {
      throw new ConflictException('An organization with the provided slug already exists.');
    }
  }

  private async findActiveOrganizationById(id: string): Promise<OrganizationResponse> {
    const organization = await this.prismaService.organization.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: ORGANIZATION_SELECT,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    return organization;
  }
}
