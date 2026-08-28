import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ConfigService } from '@nestjs/config';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { IS_PUBLIC_KEY } from '../../src/common/decorators/public.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../../src/common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../src/common/guards/permissions.guard';
import { PlatformAuthGuard } from '../../src/common/guards/platform-auth.guard';
import { CurrentPrincipal } from '../../src/common/interfaces/current-principal.interface';
import { TokenService } from '../../src/modules/auth/services/token.service';
import { RbacService } from '../../src/modules/authz/rbac.service';

const principal: CurrentPrincipal = {
  userId: 'user-a',
  email: 'user-a@example.com',
  organizationId: 'org-a',
  roles: ['member'],
  permissions: ['resource.read'],
};

function createContext(
  request: Partial<Request>,
  options: { isPublic?: boolean; permissions?: string[] } = {},
): ExecutionContext {
  class TestController {}
  const handler = () => undefined;

  if (options.isPublic) {
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  }
  if (options.permissions) {
    Reflect.defineMetadata(REQUIRED_PERMISSIONS_KEY, options.permissions, handler);
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

function createAuthGuard(options: {
  nodeEnv?: string;
  devAuthUserEmail?: string;
  verifyAccessToken?: (token: string) => Promise<{ userId: string; email: string; organizationId: string }>;
}) {
  const config = new ConfigService({
    environment: {
      nodeEnv: options.nodeEnv ?? 'production',
      devAuthUserEmail: options.devAuthUserEmail,
    },
  });
  const tokenService = {
    verifyAccessToken:
      options.verifyAccessToken ??
      (async () => ({ userId: principal.userId, email: principal.email, organizationId: principal.organizationId })),
  } as Pick<TokenService, 'verifyAccessToken'>;
  const rbacService = {
    resolvePrincipal: async () => principal,
  } as Pick<RbacService, 'resolvePrincipal'>;

  return new PlatformAuthGuard(
    new Reflector(),
    config,
    tokenService as TokenService,
    rbacService as RbacService,
  );
}

test('public endpoint succeeds without JWT', async () => {
  const guard = createAuthGuard({});
  const request = { headers: {}, method: 'GET', url: '/public' } as Partial<Request>;

  assert.equal(await guard.canActivate(createContext(request, { isPublic: true })), true);
});

test('protected endpoint without JWT fails closed with 401', async () => {
  const guard = createAuthGuard({});
  const request = { headers: {}, method: 'GET', url: '/protected' } as Partial<Request>;

  await assert.rejects(
    guard.canActivate(createContext(request)),
    (error: unknown) => error instanceof UnauthorizedException && error.getStatus() === 401,
  );
});

test('protected endpoint with invalid JWT returns 401', async () => {
  const guard = createAuthGuard({
    verifyAccessToken: async () => {
      throw new UnauthorizedException('invalid');
    },
  });
  const request = {
    headers: { authorization: 'Bearer invalid-token' },
    method: 'GET',
    url: '/protected',
  } as Partial<Request>;

  await assert.rejects(
    guard.canActivate(createContext(request)),
    (error: unknown) => error instanceof UnauthorizedException && error.getStatus() === 401,
  );
});

test('protected endpoint with valid JWT resolves an authenticated principal', async () => {
  const guard = createAuthGuard({});
  const request = {
    headers: { authorization: 'Bearer valid-token' },
    method: 'GET',
    url: '/protected',
  } as Partial<Request>;

  assert.equal(await guard.canActivate(createContext(request)), true);
  assert.deepEqual(request.principal, principal);
});

test('arbitrary identity headers cannot authenticate a production request', async () => {
  const guard = createAuthGuard({ nodeEnv: 'production' });
  const request = {
    headers: {
      'x-user-id': 'admin',
      'x-user-email': 'admin@example.com',
    },
    method: 'GET',
    url: '/protected',
  } as Partial<Request>;

  await assert.rejects(guard.canActivate(createContext(request)), UnauthorizedException);
});

test('development principal fallback cannot operate in production', async () => {
  const guard = createAuthGuard({
    nodeEnv: 'production',
    devAuthUserEmail: 'dev@example.com',
  });
  const request = { headers: {}, method: 'GET', url: '/protected' } as Partial<Request>;

  await assert.rejects(guard.canActivate(createContext(request)), UnauthorizedException);
});

test('explicit development principal fallback can operate outside production', async () => {
  const guard = createAuthGuard({
    nodeEnv: 'development',
    devAuthUserEmail: 'dev@example.com',
  });
  const request = { headers: {}, method: 'GET', url: '/protected' } as Partial<Request>;

  assert.equal(await guard.canActivate(createContext(request)), true);
  assert.deepEqual(request.principal, principal);
});

test('permission guard rejects authenticated principal lacking permission', () => {
  const guard = new PermissionsGuard(new Reflector());
  const request = {
    principal: { ...principal, permissions: [] },
  } as Partial<Request>;

  assert.throws(
    () => guard.canActivate(createContext(request, { permissions: ['resource.read'] })),
    ForbiddenException,
  );
});

test('permission guard accepts authenticated principal with permission', () => {
  const guard = new PermissionsGuard(new Reflector());
  const request = { principal } as Partial<Request>;

  assert.equal(
    guard.canActivate(createContext(request, { permissions: ['resource.read'] })),
    true,
  );
});
