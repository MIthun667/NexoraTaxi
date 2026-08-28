import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import {
  ALLOW_CROSS_ORGANIZATION_KEY,
  CROSS_ORGANIZATION_PERMISSION,
} from './allow-cross-organization.decorator';
import { PlanEnforcementService } from './plan-enforcement.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly planEnforcementService: PlanEnforcementService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const principal = request.principal;

    // Public routes have no authenticated principal and are protected by their
    // own explicit mechanism (for example Shopify HMAC on incoming webhooks).
    if (!principal) {
      return true;
    }

    const requestedOrganizationId = this.extractRequestedOrganizationId(request);
    const effectiveOrganizationId = requestedOrganizationId ?? principal.organizationId;

    if (
      requestedOrganizationId &&
      requestedOrganizationId !== principal.organizationId &&
      !this.canAccessCrossOrganization(context, principal.permissions)
    ) {
      throw new ForbiddenException('Cross-organization access is not permitted.');
    }

    await this.planEnforcementService.assertOrganizationActive(effectiveOrganizationId);
    return true;
  }

  private canAccessCrossOrganization(context: ExecutionContext, permissions: string[]): boolean {
    const explicitlyAllowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_CROSS_ORGANIZATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    return Boolean(
      explicitlyAllowed && permissions.includes(CROSS_ORGANIZATION_PERMISSION),
    );
  }

  private extractRequestedOrganizationId(request: Request): string | undefined {
    const parameterOrganizationId = request.params?.organizationId;
    if (typeof parameterOrganizationId === 'string' && parameterOrganizationId.trim()) {
      return parameterOrganizationId.trim();
    }

    const queryOrganizationId = request.query?.organizationId;
    if (typeof queryOrganizationId === 'string' && queryOrganizationId.trim()) {
      return queryOrganizationId.trim();
    }

    if (this.isRecord(request.body)) {
      const bodyOrganizationId = request.body.organizationId;
      if (typeof bodyOrganizationId === 'string' && bodyOrganizationId.trim()) {
        return bodyOrganizationId.trim();
      }
    }

    return undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
