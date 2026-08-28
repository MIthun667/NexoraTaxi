import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { TokenService } from '../../src/modules/auth/services/token.service';

function createTokenService() {
  return new TokenService(
    new ConfigService({
      environment: {
        jwtAccessSecret: 'access-secret-that-is-at-least-thirty-two-characters',
        jwtRefreshSecret: 'refresh-secret-that-is-at-least-thirty-two-characters',
        jwtAccessExpires: '15m',
        jwtRefreshExpires: '7d',
      },
    }),
    new JwtService(),
  );
}

const payload = {
  userId: 'user-a',
  organizationId: 'org-a',
  email: 'user-a@example.com',
};

test('access and refresh tokens verify only for their intended purpose', async () => {
  const service = createTokenService();
  const [accessToken, refreshToken] = await Promise.all([
    service.generateAccessToken(payload),
    service.generateRefreshToken(payload),
  ]);

  assert.deepEqual(await service.verifyAccessToken(accessToken), payload);
  assert.deepEqual(await service.verifyRefreshToken(refreshToken), payload);

  await assert.rejects(service.verifyAccessToken(refreshToken), UnauthorizedException);
  await assert.rejects(service.verifyRefreshToken(accessToken), UnauthorizedException);
});
