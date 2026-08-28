import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';

interface PrincipalLookup {
  userId?: string;
  email?: string;
}

@Injectable()
export class RbacService {
  constructor(private readonly prismaService: PrismaService) {}

  async resolvePrincipal(lookup: PrincipalLookup): Promise<CurrentPrincipal> {
    const normalizedEmail = lookup.email?.toLowerCase();

    const user = await this.prismaService.user.findFirst({
      where: {
        deletedAt: null,
        ...(lookup.userId ? { id: lookup.userId } : {}),
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
        status: true,
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Authorization principal was not found.');
    }

    if (
      user.status === UserStatus.SUSPENDED ||
      user.status === UserStatus.DEACTIVATED ||
      user.status === UserStatus.LOCKED
    ) {
      throw new ForbiddenException('Authorization principal is not active.');
    }

    return {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.userRoles.map((assignment) => assignment.role.code),
      permissions: [
        ...new Set(
          user.userRoles.flatMap((assignment) =>
            assignment.role.rolePermissions.map((rolePermission) => rolePermission.permission.code),
          ),
        ),
      ],
    };
  }
}
