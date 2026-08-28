import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PositionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../../shared/responses/response.util';
import { CreatePositionDto } from './dto/create-position.dto';
import { QueryPositionsDto } from './dto/query-positions.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import {
  POSITION_SELECT,
  PositionResponse,
  toPositionResponse,
} from './mappers/position.mapper';

@Injectable()
export class PositionsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createPositionDto: CreatePositionDto) {
    await this.ensureOrganizationExists(createPositionDto.organizationId);

    if (createPositionDto.departmentId) {
      await this.ensureDepartmentExists(
        createPositionDto.departmentId,
        createPositionDto.organizationId,
      );
    }

    await this.ensurePositionCodeIsAvailable(
      createPositionDto.organizationId,
      createPositionDto.code,
    );

    const position = await this.prismaService.position.create({
      data: {
        title: createPositionDto.title,
        code: createPositionDto.code,
        description: createPositionDto.description,
        gradeLevel: createPositionDto.gradeLevel,
        status: createPositionDto.status ?? PositionStatus.DRAFT,
        organizationId: createPositionDto.organizationId,
        departmentId: createPositionDto.departmentId,
      },
      select: POSITION_SELECT,
    });

    return buildSuccessResponse(
      'Position created successfully.',
      toPositionResponse(position),
    );
  }

  async findAll(query: QueryPositionsDto) {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();

    const where: Prisma.PositionWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                code: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [positions, total] = await this.prismaService.$transaction([
      this.prismaService.position.findMany({
        where,
        select: POSITION_SELECT,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.position.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Positions retrieved successfully.',
      positions.map((position) => toPositionResponse(position)),
      buildPaginationMeta({
        page,
        limit,
        total,
      }),
    );
  }

  async findOne(id: string) {
    const position = await this.findActivePositionById(id);

    return buildSuccessResponse(
      'Position profile retrieved successfully.',
      toPositionResponse(position),
    );
  }

  async update(id: string, updatePositionDto: UpdatePositionDto) {
    if (Object.keys(updatePositionDto).length === 0) {
      throw new BadRequestException('At least one position field must be provided for update.');
    }

    const existingPosition = await this.findActivePositionById(id);
    const organizationId = updatePositionDto.organizationId ?? existingPosition.organizationId;
    const departmentId =
      updatePositionDto.departmentId !== undefined
        ? updatePositionDto.departmentId
        : existingPosition.departmentId;
    const code = updatePositionDto.code ?? existingPosition.code;

    if (updatePositionDto.organizationId) {
      await this.ensureOrganizationExists(updatePositionDto.organizationId);
    }

    if (departmentId) {
      await this.ensureDepartmentExists(departmentId, organizationId);
    }

    if (
      organizationId !== existingPosition.organizationId ||
      code !== existingPosition.code
    ) {
      await this.ensurePositionCodeIsAvailable(organizationId, code, id);
    }

    const position = await this.prismaService.position.update({
      where: { id },
      data: {
        ...(updatePositionDto.title !== undefined ? { title: updatePositionDto.title } : {}),
        ...(updatePositionDto.code !== undefined ? { code: updatePositionDto.code } : {}),
        ...(updatePositionDto.description !== undefined
          ? { description: updatePositionDto.description }
          : {}),
        ...(updatePositionDto.gradeLevel !== undefined
          ? { gradeLevel: updatePositionDto.gradeLevel }
          : {}),
        ...(updatePositionDto.status !== undefined
          ? { status: updatePositionDto.status }
          : {}),
        ...(updatePositionDto.organizationId !== undefined
          ? { organizationId: updatePositionDto.organizationId }
          : {}),
        ...(updatePositionDto.departmentId !== undefined
          ? { departmentId: updatePositionDto.departmentId }
          : {}),
      },
      select: POSITION_SELECT,
    });

    return buildSuccessResponse(
      'Position updated successfully.',
      toPositionResponse(position),
    );
  }

  async archive(id: string) {
    await this.findActivePositionById(id);

    const position = await this.prismaService.position.update({
      where: { id },
      data: {
        status: PositionStatus.ARCHIVED,
        deletedAt: new Date(),
      },
      select: POSITION_SELECT,
    });

    return buildSuccessResponse(
      'Position archived successfully.',
      toPositionResponse(position),
    );
  }

  private async ensureOrganizationExists(organizationId: string) {
    const organization = await this.prismaService.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }
  }

  private async ensureDepartmentExists(departmentId: string, organizationId: string) {
    const department = await this.prismaService.department.findFirst({
      where: {
        id: departmentId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found.');
    }
  }

  private async ensurePositionCodeIsAvailable(
    organizationId: string,
    code: string,
    positionIdToExclude?: string,
  ) {
    const existingPosition = await this.prismaService.position.findFirst({
      where: {
        organizationId,
        code,
        deletedAt: null,
        ...(positionIdToExclude ? { id: { not: positionIdToExclude } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (existingPosition) {
      throw new ConflictException(
        'A position with the provided code already exists for this organization.',
      );
    }
  }

  private async findActivePositionById(id: string): Promise<PositionResponse> {
    const position = await this.prismaService.position.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: POSITION_SELECT,
    });

    if (!position) {
      throw new NotFoundException('Position not found.');
    }

    return position;
  }
}
