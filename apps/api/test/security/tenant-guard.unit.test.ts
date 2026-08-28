import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { CurrentPrincipal } from '../../src/common/interfaces/current-principal.interface';
import {
  ALLOW_CROSS_ORGANIZATION_KEY,
  CROSS_ORGANIZATION_PERMISSION,
} from '../../src/modules/tenancy/allow-cross-organization.decorator';
import { PlanEnforcementService } from '../../src/modules/tenancy/plan-enforcement.service';
import { TenantGuard } from '../../src/modules/tenancy/tenant-guard';

const principal: CurrentPrincipal = {
  userId: 'user-a',
  email: 'user-a@example.com',
  organizationId: 'org-a',
  roles: ['member'],
  permissions: [],
};

function createContext(
  request: Partial<Request>,
  allowCrossOrganization = false,
): ExecutionContext {
  class TestController {}
  const handler = () => undefined;

  if (allowCrossOrganization) {
    Reflect.defineMetadata(ALLOW_CROSS_ORGANIZATION_KEY, true, handler);
  }

  return {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function createGuard(activeOrganizations: string[] = ['org-a', 'org-b']) {
  const checkedOrganizations: string[] = [];
  const planEnforcement = {
    assertOrganizationActive: async (organizationId: string) => {
      checkedOrganizations.push(organizationId);
      assert.ok(activeOrganizations.includes(organizationId));
    },
  } as Pick<PlanEnforcementService, 'assertOrganizationActive'>;

  return {
    guard: new TenantGuard(planEnforcement as PlanEnforcementService, new Reflector()),
    checkedOrganizations,
  };
}

test('same-tenant organization-scoped read is allowed', async () => {
  const { guard, checkedOrganizations } = createGuard();
  const request = {
    principal,
    params: {},
    query: { organizationId: 'org-a' },
    body: undefined,
  } as Partial<Request>;

  assert.equal(await guard.canActivate(createContext(request)), true);
  assert.deepEqual(checkedOrganizations, ['org-a']);
});

test('cross-tenant organization-scoped read is denied', async () => {
  const { guard } = createGuard();
  const request = {
    principal,
    params: {},
    query: { organizationId: 'org-b' },
    body: undefined,
  } as Partial<Request>;

  await assert.rejects(guard.canActivate(createContext(request)), ForbiddenException);
});

test('cross-tenant organization-scoped mutation is denied', async () => {
  const { guard } = createGuard();
  const request = {
    principal,
    params: {},
    query: {},
    body: { organizationId: 'org-b', limit: 50 },
  } as Partial<Request>;

  await assert.rejects(guard.canActivate(createContext(request)), ForbiddenException);
});

test('cross-organization exception requires explicit route opt-in and dedicated permission', async () => {
  const { guard, checkedOrganizations } = createGuard();
  const request = {
    principal: {
      ...principal,
      permissions: [CROSS_ORGANIZATION_PERMISSION],
    },
    params: {},
    query: { organizationId: 'org-b' },
    body: undefined,
  } as Partial<Request>;

  assert.equal(await guard.canActivate(createContext(request, true)), true);
  assert.deepEqual(checkedOrganizations, ['org-b']);
});

test('dedicated cross-organization permission alone does not bypass tenant scope', async () => {
  const { guard } = createGuard();
  const request = {
    principal: {
      ...principal,
      permissions: [CROSS_ORGANIZATION_PERMISSION],
    },
    params: {},
    query: { organizationId: 'org-b' },
    body: undefined,
  } as Partial<Request>;

  await assert.rejects(guard.canActivate(createContext(request)), ForbiddenException);
});
