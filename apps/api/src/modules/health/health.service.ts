import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { getCurrentTimestamp } from '../../common/utils/date.util';
import { RedisService } from '../jobs/redis.service';
import { ObservabilityHealthService } from '../observability/health.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly observabilityHealthService: ObservabilityHealthService,
    private readonly redisService: RedisService,
  ) {}

  getHealthStatus() {
    return {
      message: 'Nexora platform is operational.',
      data: {
        service: this.configService.get<string>('environment.appName', 'Nexora Platform API'),
        version: this.configService.get<string>('environment.appVersion', '0.1.0'),
        environment: this.configService.get<string>('environment.nodeEnv', 'development'),
        status: 'healthy',
        timestamp: getCurrentTimestamp(),
      },
    };
  }

  getLivenessStatus() {
    return {
      message: 'Platform liveness check completed successfully.',
      data: {
        service: this.configService.get<string>('environment.appName', 'Nexora Platform API'),
        status: 'alive',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: getCurrentTimestamp(),
      },
    };
  }

  async getReadinessStatus() {
    const [database, redis, aiRuntime, connectors] = await Promise.all([
      this.observabilityHealthService.getDatabaseHealth(),
      this.checkRedisHealth(),
      this.observabilityHealthService.getAiRuntimeHealth(),
      this.observabilityHealthService.getConnectorHealth(),
    ]);

    if (database.status === 'UNHEALTHY' || redis.status === 'UNHEALTHY') {
      throw new ServiceUnavailableException({
        code: 'PLATFORM_NOT_READY',
        message: 'Platform dependencies are not ready.',
        details: {
          database: database.status.toLowerCase(),
          redis: redis.status.toLowerCase(),
          aiRuntime: aiRuntime.status.toLowerCase(),
          connectors: connectors.status.toLowerCase(),
        },
      });
    }

    return {
      message: 'Platform readiness check completed successfully.',
      data: {
        service: this.configService.get<string>('environment.appName', 'Nexora Platform API'),
        status: 'ready',
        dependencies: {
          database: database.status.toLowerCase(),
          redis: redis.status.toLowerCase(),
          aiRuntime: aiRuntime.status.toLowerCase(),
          connectors: connectors.status.toLowerCase(),
        },
        timestamp: getCurrentTimestamp(),
      },
    };
  }

  async getDatabaseHealth() {
    const data = await this.observabilityHealthService.getDatabaseHealth();
    return { message: 'Database health retrieved successfully.', data };
  }

  async getRedisHealth() {
    const data = await this.checkRedisHealth();
    return { message: 'Redis health retrieved successfully.', data };
  }

  async getAiRuntimeHealth() {
    const data = await this.observabilityHealthService.getAiRuntimeHealth();
    return { message: 'AI runtime health retrieved successfully.', data };
  }

  async getConnectorsHealth() {
    const data = await this.observabilityHealthService.getConnectorHealth();
    return { message: 'Connector health retrieved successfully.', data };
  }

  private async checkRedisHealth() {
    const startedAt = Date.now();
    try {
      await this.redisService.ping();
      return {
        dependency: 'redis',
        status: 'HEALTHY' as const,
        latencyMs: Date.now() - startedAt,
        checkedAt: getCurrentTimestamp(),
      };
    } catch {
      return {
        dependency: 'redis',
        status: 'UNHEALTHY' as const,
        latencyMs: Date.now() - startedAt,
        checkedAt: getCurrentTimestamp(),
      };
    }
  }
}
