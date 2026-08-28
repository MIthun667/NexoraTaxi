import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { RbacService } from '../authz/rbac.service';
import { LoginDto } from './dto/login.dto';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prismaService.user.findFirst({
      where: {
        email: loginDto.email,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
        status: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid authentication credentials.');
    }

    if (
      user.status === UserStatus.LOCKED ||
      user.status === UserStatus.SUSPENDED ||
      user.status === UserStatus.DEACTIVATED
    ) {
      throw new UnauthorizedException('Invalid authentication credentials.');
    }

    const passwordMatches = await this.passwordService.verifyPassword(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid authentication credentials.');
    }

    const principal = await this.rbacService.resolvePrincipal({
      userId: user.id,
      email: user.email,
    });

    const tokenPayload = {
      userId: principal.userId,
      organizationId: principal.organizationId,
      email: principal.email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.generateAccessToken(tokenPayload),
      this.tokenService.generateRefreshToken(tokenPayload),
    ]);

    await this.auditService.record({
      action: 'auth.login.success',
      entityType: 'user',
      entityId: user.id,
      organizationId: user.organizationId,
      actorUserId: user.id,
      summary: `User ${user.email} authenticated successfully.`,
      metadata: {
        email: user.email,
      },
    });

    return buildSuccessResponse('Authentication successful', {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        roles: principal.roles,
        permissions: principal.permissions,
      },
    });
  }

  async refresh(refreshToken: string) {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const principal = await this.rbacService.resolvePrincipal({
      userId: payload.userId,
      email: payload.email,
    });

    const accessToken = await this.tokenService.generateAccessToken({
      userId: principal.userId,
      organizationId: principal.organizationId,
      email: principal.email,
    });

    return buildSuccessResponse('Access token refreshed successfully.', {
      accessToken,
    });
  }

  async getCurrentUser(userId: string) {
    const principal = await this.rbacService.resolvePrincipal({ userId });
    const user = await this.prismaService.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Authenticated user could not be resolved.');
    }

    return buildSuccessResponse('Authenticated user profile retrieved successfully.', {
      ...user,
      roles: principal.roles,
      permissions: principal.permissions,
    });
  }
}
