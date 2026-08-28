import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import { validationSchema } from '../../src/config/validation.schema';
import { assertJobEnvelope } from '../../src/modules/jobs/job.contracts';
import {
  buildDefaultJobOptions,
  buildQueuePrefix,
  parseRedisConnection,
} from '../../src/modules/jobs/job-config.util';

test('queue prefix isolates environment namespaces', () => {
  assert.equal(buildQueuePrefix('nexora', 'development'), 'nexora:development');
  assert.equal(buildQueuePrefix('nexora-ci-42', 'test'), 'nexora-ci-42:test');
  assert.notEqual(buildQueuePrefix('nexora-staging', 'production'), buildQueuePrefix('nexora', 'production'));
});

test('Redis URL parsing preserves connection coordinates without exposing them elsewhere', () => {
  assert.deepEqual(parseRedisConnection('redis://user:pass@redis.internal:6380/2'), {
    host: 'redis.internal',
    port: 6380,
    username: 'user',
    password: 'pass',
    db: 2,
    tls: undefined,
  });
  assert.throws(() => parseRedisConnection('https://redis.example.com'), /REDIS_URL/);
});

test('default job policy is bounded exponential retry with failed jobs retained', () => {
  const options = buildDefaultJobOptions(3, 250);
  assert.equal(options.attempts, 3);
  assert.deepEqual(options.backoff, { type: 'exponential', delay: 250 });
  assert.equal(options.removeOnFail, false);
});

test('worker and retry configuration validation rejects unsafe values', () => {
  const common = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    ENCRYPTION_KEY: 'c'.repeat(32),
    SHOPIFY_API_KEY: 'key',
    SHOPIFY_API_SECRET: 'secret',
    SHOPIFY_SCOPES: 'read_products',
    SHOPIFY_REDIRECT_URI: 'http://localhost/callback',
    SHOPIFY_APP_URL: 'http://localhost',
    SHOPIFY_WEBHOOK_BASE_URL: 'http://localhost',
  };

  assert.ok(validationSchema.validate({ ...common, WORKER_CONCURRENCY: 5 }).error === undefined);
  assert.ok(validationSchema.validate({ ...common, WORKER_CONCURRENCY: 0 }).error);
  assert.ok(validationSchema.validate({ ...common, JOB_DEFAULT_ATTEMPTS: 0 }).error);
});

test('job envelope rejects unsupported versions and malformed correlation IDs', () => {
  assert.doesNotThrow(() =>
    assertJobEnvelope({ version: 1, correlationId: 'request-123', payload: {} }),
  );
  assert.throws(() => assertJobEnvelope({ version: 2, correlationId: 'request-123', payload: {} }));
  assert.throws(() => assertJobEnvelope({ version: 1, correlationId: '', payload: {} }));
});
