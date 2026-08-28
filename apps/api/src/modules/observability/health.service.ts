import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { ConnectorsRepository } from '../integrations/connectors.repository';
import { HealthCheckResult } from './observability.types';
import { ObservabilityRepository } from './observability.repository';

@Injectable()
export class ObservabilityHealthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly intelligenceService: IntelligenceService,
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly observabilityRepository: ObservabilityRepository,
  ) {}

  async getDatabaseHealth(): Promise<HealthCheckResult> {
    const startedAt = Date.now();
    try {
      await this.prismaService.$queryRawUnsafe('SELECT 1');
      const result: HealthCheckResult = {
        target: 'database',
        checkType: 'database.connectivity',
        status: 'HEALTHY',
        summary: 'PostgreSQL connection is healthy.',
        responseTimeMs: Date.now() - startedAt,
      };
      await this.record(result);
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        target: 'database',
        checkType: 'database.connectivity',
        status: 'UNHEALTHY',
        summary: error instanceof Error ? error.message : 'Database connectivity failed.',
        responseTimeMs: Date.now() - startedAt,
      };
      await this.record(result);
      return result;
    }
  }

  async getAiRuntimeHealth(): Promise<HealthCheckResult> {
    const startedAt = Date.now();
    try {
      const response = await this.intelligenceService.checkHealth();
      const status = response?.data?.status === 'healthy' ? 'HEALTHY' : response?.data?.status === 'disabled' ? 'DEGRADED' : 'UNHEALTHY';
      const result: HealthCheckResult = {
        target: 'ai-runtime',
        checkType: 'ai-runtime.health',
        status,
        summary: `AI runtime status: ${response?.data?.status ?? 'unknown'}.`,
        responseTimeMs: Date.now() - startedAt,
        metadata: response?.data ?? null,
      };
      await this.record(result);
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        target: 'ai-runtime',
        checkType: 'ai-runtime.health',
        status: 'UNHEALTHY',
        summary: error instanceof Error ? error.message : 'AI runtime health check failed.',
        responseTimeMs: Date.now() - startedAt,
      };
      await this.record(result);
      return result;
    }
  }

  async getConnectorHealth(organizationId?: string | null): Promise<HealthCheckResult> {
    const startedAt = Date.now();
    const instances = organizationId
      ? await this.connectorsRepository.listInstances(organizationId)
      : [];
    const total = instances.length;
    const errored = instances.filter((instance) => instance.status === 'ERROR').length;
    const disabled = instances.filter((instance) => instance.status === 'DISABLED').length;
    const status = errored > 0 ? 'DEGRADED' : 'HEALTHY';
    const result: HealthCheckResult = {
      target: 'connectors',
      checkType: 'connectors.health',
      status,
      summary: `${total} connector instance(s), ${errored} errored, ${disabled} disabled.`,
      responseTimeMs: Date.now() - startedAt,
      metadata: { total, errored, disabled },
    };
    await this.record(result, organizationId ?? null);
    return result;
  }

  async getPlatformHealth(organizationId?: string | null) {
    const [database, aiRuntime, connectors] = await Promise.all([
      this.getDatabaseHealth(),
      this.getAiRuntimeHealth(),
      this.getConnectorHealth(organizationId),
    ]);

    const statuses = [database.status, aiRuntime.status, connectors.status];
    const overallStatus = statuses.includes('UNHEALTHY')
      ? 'UNHEALTHY'
      : statuses.includes('DEGRADED')
        ? 'DEGRADED'
        : 'HEALTHY';

    return {
      overallStatus,
      checks: {
        database,
        aiRuntime,
        connectors,
      },
      checkedAt: new Date().toISOString(),
    };
  }

  private async record(result: HealthCheckResult, organizationId?: string | null) {
    await this.observabilityRepository.createHealthCheckLog({
      organizationId: organizationId ?? null,
      checkType: result.checkType,
      target: result.target,
      status: result.status,
      responseTimeMs: result.responseTimeMs ?? null,
      summary: result.summary,
      metadata: (result.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    }).catch(() => null);
  }
}
