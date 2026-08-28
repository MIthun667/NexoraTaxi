import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PlatformLoggerService,
  ) {
    const redisUrl = this.configService.getOrThrow<string>('environment.redisUrl');
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 2,
    });

    this.client.on('error', (error) => {
      this.logger.warn({
        event: 'redis.connection.error',
        errorName: error.name,
        errorMessage: error.message,
      });
    });
  }

  async ping(): Promise<'PONG'> {
    await this.ensureConnected();
    const response = await this.client.ping();
    if (response !== 'PONG') {
      throw new Error('Redis ping returned an unexpected response.');
    }
    return 'PONG';
  }

  async incrementWithTtl(key: string, ttlSeconds: number): Promise<{ count: number; ttl: number }> {
    await this.ensureConnected();

    const result = (await this.client.eval(
      `
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        local ttl = redis.call('TTL', KEYS[1])
        return { current, ttl }
      `,
      1,
      key,
      String(ttlSeconds),
    )) as [number, number];

    return {
      count: Number(result[0]),
      ttl: Number(result[1]),
    };
  }

  async deleteByPattern(pattern: string): Promise<number> {
    await this.ensureConnected();
    let cursor = '0';
    let deleted = 0;

    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        deleted += await this.client.del(...keys);
      }
    } while (cursor !== '0');

    return deleted;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'end') {
      return;
    }

    if (this.client.status === 'wait') {
      this.client.disconnect(false);
      return;
    }

    try {
      await this.client.quit();
    } catch {
      this.client.disconnect(false);
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }
}
