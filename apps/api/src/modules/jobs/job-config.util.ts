import { ConnectionOptions, JobsOptions } from 'bullmq';

export interface JobRuntimeConfiguration {
  redisUrl: string;
  queuePrefix: string;
  defaultAttempts: number;
  backoffMs: number;
  workerConcurrency: number;
}

export function buildQueuePrefix(basePrefix: string, nodeEnv: string): string {
  const normalizedBase = basePrefix.trim().replace(/:+$/, '') || 'nexora';
  const normalizedEnvironment = nodeEnv.trim() || 'development';
  return `${normalizedBase}:${normalizedEnvironment}`;
}

export function parseRedisConnection(redisUrl: string): ConnectionOptions {
  const parsed = new URL(redisUrl);
  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error('REDIS_URL must use redis:// or rediss://.');
  }

  const db = parsed.pathname && parsed.pathname !== '/' ? Number(parsed.pathname.slice(1)) : 0;
  if (!Number.isInteger(db) || db < 0) {
    throw new Error('REDIS_URL database index must be a non-negative integer.');
  }

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  };
}

export function buildDefaultJobOptions(
  attempts: number,
  backoffMs: number,
): JobsOptions {
  return {
    attempts,
    backoff: {
      type: 'exponential',
      delay: backoffMs,
    },
    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 1000,
    },
    removeOnFail: false,
  };
}
