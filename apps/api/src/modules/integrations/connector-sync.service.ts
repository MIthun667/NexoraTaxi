import { ConnectorSyncJobStatus, Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';

import { DomainEventsService } from '../notifications/domain-events.service';
import { AlertingService } from '../observability/alerting.service';
import { IncidentMonitorService } from '../observability/incident-monitor.service';
import { PlanEnforcementService } from '../tenancy/plan-enforcement.service';
import { ConnectorAuthService } from './connector-auth.service';
import { ConnectorRegistryService } from './connector-registry.service';
import { ConnectorsRepository } from './connectors.repository';
import { ConnectorInstanceContext, ConnectorSyncRequest } from './integrations.types';

@Injectable()
export class ConnectorSyncService {
  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly connectorRegistryService: ConnectorRegistryService,
    private readonly connectorAuthService: ConnectorAuthService,
    private readonly domainEventsService: DomainEventsService,
    private readonly alertingService: AlertingService,
    private readonly incidentMonitorService: IncidentMonitorService,
    private readonly planEnforcementService: PlanEnforcementService,
  ) {}

  async runSync(request: ConnectorSyncRequest) {
    await this.planEnforcementService.assertFeatureEnabled(request.organizationId, 'integrations');
    const instance = await this.connectorsRepository.findInstanceById(request.connectorInstanceId);
    if (!instance) {
      throw new NotFoundException('Connector instance not found.');
    }

    const connector = this.connectorRegistryService.getConnector(instance.connectorDefinition.key);
    if (!connector.runSync) {
      return {
        success: false,
        status: ConnectorSyncJobStatus.PARTIAL,
        summary: `Connector ${connector.name} does not implement sync jobs.`,
      };
    }

    const job = await this.connectorsRepository.createSyncJob({
      connectorInstanceId: request.connectorInstanceId,
      jobType: request.jobType,
      status: ConnectorSyncJobStatus.RUNNING,
      startedAt: new Date(),
      metadata: (request.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      checkpoint: (request.checkpoint ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    });

    try {
      const result = await connector.runSync(this.toContext(instance), request);
      await this.connectorsRepository.updateSyncJob(job.id, {
        status: result.status,
        finishedAt: new Date(),
        resultSummary: result.summary,
        checkpoint: (result.checkpoint ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        metadata: (result.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      });

      await this.domainEventsService.publish({
        organizationId: request.organizationId,
        eventType: 'connector.sync.completed',
        aggregateType: 'connector-instance',
        aggregateId: request.connectorInstanceId,
        payload: {
          jobType: request.jobType,
          status: result.status,
          importedCount: result.importedCount ?? 0,
        },
      });

      return result;
    } catch (error) {
      await this.connectorsRepository.updateSyncJob(job.id, {
        status: ConnectorSyncJobStatus.FAILED,
        finishedAt: new Date(),
        resultSummary: error instanceof Error ? error.message : 'Unknown sync failure',
      });

      await this.alertingService.raiseAlert({
        organizationId: request.organizationId,
        sourceModule: 'integrations',
        alertType: 'connector.sync.failure',
        severity: 'WARNING',
        title: `Connector sync failed: ${request.jobType}`,
        summary: error instanceof Error ? error.message : 'Unknown sync failure',
        metadata: {
          connectorInstanceId: request.connectorInstanceId,
          jobType: request.jobType,
        },
      });

      await this.incidentMonitorService.createReliabilityIncident({
        organizationId: request.organizationId,
        sourceModule: 'integrations',
        incidentType: 'CONNECTOR_SYNC_FAILURE',
        title: `Connector sync failure for ${request.jobType}`,
        description: error instanceof Error ? error.message : 'Unknown sync failure',
        severity: 'MEDIUM',
        relatedEntityType: 'connector-instance',
        relatedEntityId: request.connectorInstanceId,
      });
      throw error;
    }
  }

  private toContext(instance: NonNullable<Awaited<ReturnType<ConnectorsRepository['findInstanceById']>>>): ConnectorInstanceContext {
    return {
      id: instance.id,
      organizationId: instance.organizationId ?? null,
      displayName: instance.displayName,
      status: instance.status,
      definition: {
        id: instance.connectorDefinition.id,
        key: instance.connectorDefinition.key,
        name: instance.connectorDefinition.name,
        category: instance.connectorDefinition.category,
        authType: instance.connectorDefinition.authType,
        capabilities: instance.connectorDefinition.capabilities,
      },
      configuration:
        instance.configuration && typeof instance.configuration === 'object' && !Array.isArray(instance.configuration)
          ? (instance.configuration as Record<string, unknown>)
          : null,
      credentials: instance.credentials.map((credential) => ({
        type: credential.credentialType,
        secret: this.connectorAuthService.decryptSecret(credential.encryptedSecret),
        expiresAt: credential.expiresAt,
      })),
    };
  }
}
