import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmploymentStatus, Prisma } from '@prisma/client';

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
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  EMPLOYEE_SELECT,
  EmployeeResponse,
  toEmployeeResponse,
} from './mappers/employee.mapper';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    await this.ensureOrganizationExists(createEmployeeDto.organizationId);
    await this.validateEmployeeReferences({
      organizationId: createEmployeeDto.organizationId,
      departmentId: createEmployeeDto.departmentId,
      positionId: createEmployeeDto.positionId,
      userId: createEmployeeDto.userId,
    });
    await this.ensureEmployeeCodeIsAvailable(
      createEmployeeDto.organizationId,
      createEmployeeDto.employeeCode,
    );
    await this.ensureWorkEmailIsAvailable(
      createEmployeeDto.organizationId,
      createEmployeeDto.workEmail,
    );
    await this.ensureUserLinkIsAvailable(createEmployeeDto.userId);

    const employee = await this.prismaService.employee.create({
      data: {
        employeeCode: createEmployeeDto.employeeCode,
        firstName: createEmployeeDto.firstName,
        lastName: createEmployeeDto.lastName,
        workEmail: createEmployeeDto.workEmail,
        phoneNumber: createEmployeeDto.phoneNumber,
        employmentStatus: createEmployeeDto.employmentStatus ?? EmploymentStatus.ONBOARDING,
        hireDate: new Date(createEmployeeDto.hireDate),
        organizationId: createEmployeeDto.organizationId,
        departmentId: createEmployeeDto.departmentId,
        positionId: createEmployeeDto.positionId,
        userId: createEmployeeDto.userId,
      },
      select: EMPLOYEE_SELECT,
    });

    return buildSuccessResponse(
      'Employee record created successfully.',
      toEmployeeResponse(employee),
    );
  }

  async findAll(query: QueryEmployeesDto) {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();

    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      ...(query.employmentStatus ? { employmentStatus: query.employmentStatus } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.positionId ? { positionId: query.positionId } : {}),
      ...(search
        ? {
            OR: [
              {
                employeeCode: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                workEmail: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                firstName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                lastName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [employees, total] = await this.prismaService.$transaction([
      this.prismaService.employee.findMany({
        where,
        select: EMPLOYEE_SELECT,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.employee.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Employees retrieved successfully.',
      employees.map((employee) => toEmployeeResponse(employee)),
      buildPaginationMeta({
        page,
        limit,
        total,
      }),
    );
  }

  async findOne(id: string) {
    const employee = await this.findActiveEmployeeById(id);

    return buildSuccessResponse(
      'Employee profile retrieved successfully.',
      toEmployeeResponse(employee),
    );
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    if (Object.keys(updateEmployeeDto).length === 0) {
      throw new BadRequestException('At least one employee field must be provided for update.');
    }

    const existingEmployee = await this.findActiveEmployeeById(id);
    const organizationId = updateEmployeeDto.organizationId ?? existingEmployee.organizationId;
    const employeeCode = updateEmployeeDto.employeeCode ?? existingEmployee.employeeCode;
    const workEmail = updateEmployeeDto.workEmail ?? existingEmployee.workEmail;
    const departmentId =
      updateEmployeeDto.departmentId !== undefined
        ? updateEmployeeDto.departmentId
        : existingEmployee.departmentId;
    const positionId =
      updateEmployeeDto.positionId !== undefined
        ? updateEmployeeDto.positionId
        : existingEmployee.positionId;
    const userId =
      updateEmployeeDto.userId !== undefined ? updateEmployeeDto.userId : existingEmployee.userId;

    if (updateEmployeeDto.organizationId) {
      await this.ensureOrganizationExists(updateEmployeeDto.organizationId);
    }

    await this.validateEmployeeReferences({
      organizationId,
      departmentId,
      positionId,
      userId,
    });

    if (
      organizationId !== existingEmployee.organizationId ||
      employeeCode !== existingEmployee.employeeCode
    ) {
      await this.ensureEmployeeCodeIsAvailable(organizationId, employeeCode, id);
    }

    if (
      organizationId !== existingEmployee.organizationId ||
      workEmail !== existingEmployee.workEmail
    ) {
      await this.ensureWorkEmailIsAvailable(organizationId, workEmail, id);
    }

    if (userId !== existingEmployee.userId) {
      await this.ensureUserLinkIsAvailable(userId, id);
    }

    const employee = await this.prismaService.employee.update({
      where: { id },
      data: {
        ...(updateEmployeeDto.employeeCode !== undefined
          ? { employeeCode: updateEmployeeDto.employeeCode }
          : {}),
        ...(updateEmployeeDto.firstName !== undefined
          ? { firstName: updateEmployeeDto.firstName }
          : {}),
        ...(updateEmployeeDto.lastName !== undefined
          ? { lastName: updateEmployeeDto.lastName }
          : {}),
        ...(updateEmployeeDto.workEmail !== undefined
          ? { workEmail: updateEmployeeDto.workEmail }
          : {}),
        ...(updateEmployeeDto.phoneNumber !== undefined
          ? { phoneNumber: updateEmployeeDto.phoneNumber }
          : {}),
        ...(updateEmployeeDto.employmentStatus !== undefined
          ? { employmentStatus: updateEmployeeDto.employmentStatus }
          : {}),
        ...(updateEmployeeDto.hireDate !== undefined
          ? { hireDate: new Date(updateEmployeeDto.hireDate) }
          : {}),
        ...(updateEmployeeDto.organizationId !== undefined
          ? { organizationId: updateEmployeeDto.organizationId }
          : {}),
        ...(updateEmployeeDto.departmentId !== undefined
          ? { departmentId: updateEmployeeDto.departmentId }
          : {}),
        ...(updateEmployeeDto.positionId !== undefined
          ? { positionId: updateEmployeeDto.positionId }
          : {}),
        ...(updateEmployeeDto.userId !== undefined ? { userId: updateEmployeeDto.userId } : {}),
      },
      select: EMPLOYEE_SELECT,
    });

    await this.auditService.record({
      action: 'employee.update',
      entityType: 'employee',
      entityId: employee.id,
      organizationId: employee.organizationId,
      summary: `Employee ${employee.employeeCode} was updated.`,
      metadata: updateEmployeeDto as Prisma.InputJsonValue,
    });

    return buildSuccessResponse(
      'Employee record updated successfully.',
      toEmployeeResponse(employee),
    );
  }

  async archive(id: string) {
    await this.findActiveEmployeeById(id);

    const employee = await this.prismaService.employee.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
      select: EMPLOYEE_SELECT,
    });

    await this.auditService.record({
      action: 'employee.archive',
      entityType: 'employee',
      entityId: employee.id,
      organizationId: employee.organizationId,
      summary: `Employee ${employee.employeeCode} was archived.`,
    });

    return buildSuccessResponse(
      'Employee record archived successfully.',
      toEmployeeResponse(employee),
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

  private async validateEmployeeReferences(params: {
    organizationId: string;
    departmentId?: string | null;
    positionId?: string | null;
    userId?: string | null;
  }) {
    const { organizationId, departmentId, positionId, userId } = params;

    if (departmentId) {
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

    if (positionId) {
      const position = await this.prismaService.position.findFirst({
        where: {
          id: positionId,
          organizationId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!position) {
        throw new NotFoundException('Position not found.');
      }
    }

    if (userId) {
      const user = await this.prismaService.user.findFirst({
        where: {
          id: userId,
          organizationId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found.');
      }
    }
  }

  private async ensureEmployeeCodeIsAvailable(
    organizationId: string,
    employeeCode: string,
    employeeIdToExclude?: string,
  ) {
    const existingEmployee = await this.prismaService.employee.findFirst({
      where: {
        organizationId,
        employeeCode,
        deletedAt: null,
        ...(employeeIdToExclude ? { id: { not: employeeIdToExclude } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (existingEmployee) {
      throw new ConflictException(
        'An employee with the provided employee code already exists for this organization.',
      );
    }
  }

  private async ensureWorkEmailIsAvailable(
    organizationId: string,
    workEmail: string,
    employeeIdToExclude?: string,
  ) {
    const existingEmployee = await this.prismaService.employee.findFirst({
      where: {
        organizationId,
        workEmail,
        deletedAt: null,
        ...(employeeIdToExclude ? { id: { not: employeeIdToExclude } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (existingEmployee) {
      throw new ConflictException(
        'An employee with the provided work email already exists for this organization.',
      );
    }
  }

  private async ensureUserLinkIsAvailable(userId?: string | null, employeeIdToExclude?: string) {
    if (!userId) {
      return;
    }

    const existingEmployee = await this.prismaService.employee.findFirst({
      where: {
        userId,
        deletedAt: null,
        ...(employeeIdToExclude ? { id: { not: employeeIdToExclude } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (existingEmployee) {
      throw new ConflictException(
        'The provided user account is already linked to another employee record.',
      );
    }
  }

  private async findActiveEmployeeById(id: string): Promise<EmployeeResponse> {
    const employee = await this.prismaService.employee.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: EMPLOYEE_SELECT,
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    return employee;
  }
}
