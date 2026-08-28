import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DepartmentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../../shared/responses/response.util';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { QueryDepartmentsDto } from './dto/query-departments.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import {
  DepartmentResponse,
  DEPARTMENT_SELECT,
  toDepartmentResponse,
} from './mappers/department.mapper';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    await this.ensureOrganizationExists(createDepartmentDto.organizationId);
    await this.ensureDepartmentCodeIsAvailable(
      createDepartmentDto.organizationId,
      createDepartmentDto.code,
    );

    const department = await this.prismaService.department.create({
      data: {
        name: createDepartmentDto.name,
        code: createDepartmentDto.code,
        description: createDepartmentDto.description,
        status: createDepartmentDto.status ?? DepartmentStatus.ACTIVE,
        organizationId: createDepartmentDto.organizationId,
      },
      select: DEPARTMENT_SELECT,
    });

    return buildSuccessResponse(
      'Department created successfully.',
      toDepartmentResponse(department),
    );
  }

  async findAll(query: QueryDepartmentsDto) {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();

    const where: Prisma.DepartmentWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
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
                code: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [departments, total] = await this.prismaService.$transaction([
      this.prismaService.department.findMany({
        where,
        select: DEPARTMENT_SELECT,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.department.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Departments retrieved successfully.',
      departments.map((department) => toDepartmentResponse(department)),
      buildPaginationMeta({
        page,
        limit,
        total,
      }),
    );
  }

  async findOne(id: string) {
    const department = await this.findActiveDepartmentById(id);

    return buildSuccessResponse(
      'Department profile retrieved successfully.',
      toDepartmentResponse(department),
    );
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    if (Object.keys(updateDepartmentDto).length === 0) {
      throw new BadRequestException('At least one department field must be provided for update.');
    }

    const existingDepartment = await this.findActiveDepartmentById(id);
    const organizationId = updateDepartmentDto.organizationId ?? existingDepartment.organizationId;
    const code = updateDepartmentDto.code ?? existingDepartment.code;

    if (updateDepartmentDto.organizationId) {
      await this.ensureOrganizationExists(updateDepartmentDto.organizationId);
    }

    if (
      organizationId !== existingDepartment.organizationId ||
      code !== existingDepartment.code
    ) {
      await this.ensureDepartmentCodeIsAvailable(organizationId, code, id);
    }

    const department = await this.prismaService.department.update({
      where: { id },
      data: {
        ...(updateDepartmentDto.name !== undefined ? { name: updateDepartmentDto.name } : {}),
        ...(updateDepartmentDto.code !== undefined ? { code: updateDepartmentDto.code } : {}),
        ...(updateDepartmentDto.description !== undefined
          ? { description: updateDepartmentDto.description }
          : {}),
        ...(updateDepartmentDto.status !== undefined
          ? { status: updateDepartmentDto.status }
          : {}),
        ...(updateDepartmentDto.organizationId !== undefined
          ? { organizationId: updateDepartmentDto.organizationId }
          : {}),
      },
      select: DEPARTMENT_SELECT,
    });

    return buildSuccessResponse(
      'Department updated successfully.',
      toDepartmentResponse(department),
    );
  }

  async archive(id: string) {
    await this.findActiveDepartmentById(id);

    const department = await this.prismaService.department.update({
      where: { id },
      data: {
        status: DepartmentStatus.ARCHIVED,
        deletedAt: new Date(),
      },
      select: DEPARTMENT_SELECT,
    });

    return buildSuccessResponse(
      'Department archived successfully.',
      toDepartmentResponse(department),
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

  private async ensureDepartmentCodeIsAvailable(
    organizationId: string,
    code: string,
    departmentIdToExclude?: string,
  ) {
    const existingDepartment = await this.prismaService.department.findFirst({
      where: {
        organizationId,
        code,
        deletedAt: null,
        ...(departmentIdToExclude ? { id: { not: departmentIdToExclude } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (existingDepartment) {
      throw new ConflictException(
        'A department with the provided code already exists for this organization.',
      );
    }
  }

  private async findActiveDepartmentById(id: string): Promise<DepartmentResponse> {
    const department = await this.prismaService.department.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: DEPARTMENT_SELECT,
    });

    if (!department) {
      throw new NotFoundException('Department not found.');
    }

    return department;
  }
}
