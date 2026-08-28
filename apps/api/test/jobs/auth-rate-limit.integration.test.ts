import * as assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';

import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

import { AuthRateLimitMiddleware } from '../../src/common/middleware/auth-rate-limit.middleware';
import { PlatformLoggerService } from '../../src/common/services/platform-logger.service';
import { RedisService } from '../../src/modules/jobs/redis.service';

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const uniquePath = `/auth/login-${randomUUID()}`;
const identity = `POST:${uniquePath}:203.0.113.42`;
const keyHash = createHash('sha256').update(identity).digest('hex');
const redisKey = `nexora:test:auth-rate-limit:${keyHash}`;

let redisA: RedisService;
let redisB: RedisService;
let limiterA: AuthRateLimitMiddleware;
let limiterB: AuthRateLimitMiddleware;

const logger = {
  warn: () => undefined,
  error: () => undefined,
  log: () => undefined,
  debug: () => undefined,
} as unknown as PlatformLoggerService;

before(async () => {
  const redisConfig = new ConfigService({ environment: { redisUrl } });
  redisA = new RedisService(redisConfig, logger);
  redisB = new RedisService(redisConfig, logger);
  await redisA.deleteByPattern(redisKey);

  const limiterConfig = new ConfigService({
    environment: {
      authRateLimitTtl: 1,
      authRateLimitLimit: 2,
      nodeEnv: 'test',
    },
  });
  limiterA = new AuthRateLimitMiddleware(limiterConfig, redisA);
  limiterB = new AuthRateLimitMiddleware(limiterConfig, redisB);
});

after(async () => {
  await redisA.deleteByPattern(redisKey);
  await Promise.all([redisA.onModuleDestroy(), redisB.onModuleDestroy()]);
});

function request(): Request {
  return {
    method: 'POST',
    baseUrl: uniquePath,
    path: '',
    ip: '203.0.113.42',
  } as unknown as Request;
}

function invoke(limiter: AuthRateLimitMiddleware): Promise<unknown> {
  return new Promise((resolve) => {
    const response = { setHeader: () => undefined } as unknown as Response;
    const next: NextFunction = (error?: unknown) => resolve(error);
    void limiter.use(request(), response, next);
  });
}

test('separate API limiter instances share atomic Redis state and TTL reset', async () => {
  assert.equal(await invoke(limiterA), undefined);
  assert.equal(await invoke(limiterB), undefined);

  const blocked = await invoke(limiterA);
  assert.ok(blocked instanceof HttpException);
  assert.equal(blocked.getStatus(), 429);

  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(await invoke(limiterB), undefined);
});

test('authentication limiter fails safely when Redis protection is unavailable', async () => {
  const brokenRedis = {
    incrementWithTtl: async () => {
      throw new Error('redis unavailable');
    },
  } as unknown as RedisService;
  const config = new ConfigService({
    environment: { authRateLimitTtl: 60, authRateLimitLimit: 10, nodeEnv: 'test' },
  });
  const limiter = new AuthRateLimitMiddleware(config, brokenRedis);
  const error = await invoke(limiter);
  assert.ok(error instanceof HttpException);
  assert.equal(error.getStatus(), 503);
});
