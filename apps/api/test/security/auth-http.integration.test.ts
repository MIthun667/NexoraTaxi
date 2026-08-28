import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { Permissions } from '../../src/common/decorators/permissions.decorator';
import { Public } from '../../src/common/decorators/public.decorator';
import { PermissionsGuard } from '../../src/common/guards/permissions.guard';
import { PlatformAuthGuard } from '../../src/common/guards/platform-auth.guard';
import { CurrentPrincipal } from '../../src/common/interfaces/current-principal.interface';
import { TokenService } from '../../src/modules/auth/services/token.service';
import { RbacService } from '../../src/modules/authz/rbac.service';

@Controller('security-test')
class SecurityTestController {
  @Get('public')
  @Public()
  publicRoute() {
    return { ok: true };
  }

  @Get('protected')
  protectedRoute() {
    return { ok: true };
  }

  @Get('permission')
  @Permissions('resource.read')
  permissionRoute() {
    return { ok: true };
  }
}

const allowedPrincipal: CurrentPrincipal = {
  userId: 'allowed-user',
  email: 'allowed@example.com',
  organizationId: 'org-a',
  roles: ['member'],
  permissions: ['resource.read'],
};

const deniedPrincipal: CurrentPrincipal = {
  ...allowedPrincipal,
  userId: 'denied-user',
  email: 'denied@example.com',
  permissions: [],
};

let app: INestApplication;
let baseUrl: string;

before(async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [SecurityTestController],
    providers: [
      {
        provide: ConfigService,
        useValue: {
          get: (key: string, fallback?: unknown) => {
            if (key === 'environment.nodeEnv') {
              return 'production';
            }
            if (key === 'environment.devAuthUserEmail') {
              return undefined;
            }
            return fallback;
          },
        },
      },
      {
        provide: TokenService,
        useValue: {
          verifyAccessToken: async (token: string) => {
            if (token === 'allowed') {
              return {
                userId: allowedPrincipal.userId,
                email: allowedPrincipal.email,
                organizationId: allowedPrincipal.organizationId,
              };
            }
            if (token === 'denied') {
              return {
                userId: deniedPrincipal.userId,
                email: deniedPrincipal.email,
                organizationId: deniedPrincipal.organizationId,
              };
            }
            throw new Error('invalid token');
          },
        },
      },
      {
        provide: RbacService,
        useValue: {
          resolvePrincipal: async ({ userId }: { userId?: string }) =>
            userId === deniedPrincipal.userId ? deniedPrincipal : allowedPrincipal,
        },
      },
      {
        provide: APP_GUARD,
        useClass: PlatformAuthGuard,
      },
      {
        provide: APP_GUARD,
        useClass: PermissionsGuard,
      },
    ],
  }).compile();

  app = moduleRef.createNestApplication();
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

after(async () => {
  await app.close();
});

test('public endpoint succeeds without JWT', async () => {
  const response = await fetch(`${baseUrl}/security-test/public`);
  assert.equal(response.status, 200);
});

test('protected endpoint without JWT returns 401', async () => {
  const response = await fetch(`${baseUrl}/security-test/protected`);
  assert.equal(response.status, 401);
});

test('protected endpoint with invalid JWT returns 401', async () => {
  const response = await fetch(`${baseUrl}/security-test/protected`, {
    headers: { authorization: 'Bearer invalid' },
  });
  assert.equal(response.status, 401);
});

test('protected endpoint with valid JWT succeeds', async () => {
  const response = await fetch(`${baseUrl}/security-test/protected`, {
    headers: { authorization: 'Bearer allowed' },
  });
  assert.equal(response.status, 200);
});

test('permission endpoint rejects authenticated principal lacking permission', async () => {
  const response = await fetch(`${baseUrl}/security-test/permission`, {
    headers: { authorization: 'Bearer denied' },
  });
  assert.equal(response.status, 403);
});

test('permission endpoint accepts authenticated principal with permission', async () => {
  const response = await fetch(`${baseUrl}/security-test/permission`, {
    headers: { authorization: 'Bearer allowed' },
  });
  assert.equal(response.status, 200);
});
