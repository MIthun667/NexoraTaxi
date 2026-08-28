import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { TokenService } from '../../modules/auth/services/token.service';
import { RbacService } from '../../modules/authz/rbac.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PlatformAuthGuard implements CanActivate {
  private readonly logger = new Logger(PlatformAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    if (request.principal) {
      return true;
    }

    const bearerToken = this.extractBearerToken(request);

    if (bearerToken) {
      const payload = await this.tokenService.verifyAccessToken(bearerToken);
      request.principal = await this.rbacService.resolvePrincipal({
        userId: payload.userId,
        email: payload.email,
      });
      return true;
    }

    const nodeEnv = this.configService.get<string>('environment.nodeEnv', 'development');
    const devAuthUserEmail = this.configService.get<string>(
      'environment.devAuthUserEmail',
      'admin@northstar-universal.demo',
    );
    const userIdHeader = this.getHeaderValue(request, 'x-user-id');
    const userEmailHeader = this.getHeaderValue(request, 'x-user-email');
    const identifier = {
      userId: userIdHeader,
      email: userEmailHeader ?? (nodeEnv !== 'production' ? devAuthUserEmail : undefined),
    };

    if (!identifier.userId && !identifier.email) {
      throw new UnauthorizedException(
        'Authenticated principal is required to access this resource.',
      );
    }

    if (!userIdHeader && !userEmailHeader && nodeEnv !== 'production') {
      this.logger.debug(
        `Using development principal fallback for ${request.method} ${request.url}: ${devAuthUserEmail}`,
      );
    }

    request.principal = await this.rbacService.resolvePrincipal(identifier);
    return true;
  }

  private getHeaderValue(request: Request, headerName: string): string | undefined {
    const header = request.headers[headerName];

    if (Array.isArray(header)) {
      return header[0];
    }

    return typeof header === 'string' && header.trim().length > 0 ? header.trim() : undefined;
  }

  private extractBearerToken(request: Request): string | undefined {
    const authorizationHeader = this.getHeaderValue(request, 'authorization');

    if (!authorizationHeader) {
      return undefined;
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return undefined;
    }

    return token.trim();
  }
}
