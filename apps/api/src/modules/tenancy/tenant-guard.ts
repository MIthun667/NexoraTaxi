import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

import { PlanEnforcementService } from './plan-enforcement.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly planEnforcementService: PlanEnforcementService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const organizationId = request.principal?.organizationId;
    if (!organizationId) {
      return true;
    }

    await this.planEnforcementService.assertOrganizationActive(organizationId);
    return true;
  }
}
