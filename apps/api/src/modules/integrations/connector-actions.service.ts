import { ConnectorActionLogStatus, Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';

import { DomainEventsService } from '../notifications/domain-events.service';
import { AlertingService } from '../observability/alerting.service';
import { IncidentMonitorService } from '../observability/incident-monitor.service';
import { PlanEnforcementService } from '../tenancy/plan-enforcement.service';
import { UsageMeterService } from '../tenancy/usage-meter.service';
import { ConnectorPolicyService } from './policies/connector-policy.service';
import { ConnectorAuthService } from './connector-auth.service';
import { ConnectorRegistryService } from './connector-registry.service';
import { ConnectorsRepository } from './connectors.repository';
import { ConnectorActionRequest, ConnectorInstanceContext } from './integrations.types';

@Injectable()
export class ConnectorActionsService {
  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly connectorRegistryService: ConnectorRegistryService,
    private readonly connectorAuthService: ConnectorAuthService,
    private readonly connectorPolicyService: ConnectorPolicyService,
    private readonly domainEventsService: DomainEventsService,
    private readonly alertingService: AlertingService,
    private readonly incidentMonitorService: IncidentMonitorService,
    private readonly planEnforcementService: PlanEnforcementService,
    private readonly usageMeterService: UsageMeterService,
  ) {}

  async execute(request: ConnectorActionRequest) {
    await this.planEnforcementService.assertFeatureEnabled(request.organizationId, 'integrations');
    await this.planEnforcementService.assertUsageAllowed(request.organizationId, 'CONNECTOR_CALLS', 1);
    const instance = await this.connectorsRepository.findInstanceById(request.connectorInstanceId);
    if (!instance) {
      throw new NotFoundException('Connector instance not found.');
    }

    this.connectorPolicyService.assertOrganizationScope(instance.organizationId ?? null, request.organizationId);
    this.connectorPolicyService.assertOutboundActionAllowed(request.actionType, request.payload ?? null);

    const connector = this.connectorRegistryService.getConnector(instance.connectorDefinition.key);
    const context = this.toContext(instance);

    const actionLog = await this.connectorsRepository.createActionLog({
      organizationId: request.organizationId,
      connectorInstanceId: request.connectorInstanceId,
      actionType: request.actionType,
      targetRef: request.targetRef ?? null,
      requestPayload: (request.payload ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      status: ConnectorActionLogStatus.PENDING,
    });

    try {
      const result = await connector.executeAction(context, request);
      await this.connectorsRepository.updateActionLog(actionLog.id, {
        status: result.status,
        responsePayload: (result.responsePayload ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      });

      await this.domainEventsService.publish({
        organizationId: request.organizationId,
        eventType: 'connector.action.executed',
        aggregateType: 'connector-instance',
        aggregateId: request.connectorInstanceId,
        payload: {
          actionType: request.actionType,
          status: result.status,
          summary: result.summary,
          externalRef: result.externalRef ?? null,
        },
      });

      await this.usageMeterService.recordUsage({
        organizationId: request.organizationId,
        metricType: 'CONNECTOR_CALLS',
        metricValue: 1,
        metadata: {
          connectorInstanceId: request.connectorInstanceId,
          actionType: request.actionType,
        },
      });

      return result;
    } catch (error) {
      await this.connectorsRepository.updateActionLog(actionLog.id, {
        status: ConnectorActionLogStatus.FAILED,
        responsePayload: {
          error: error instanceof Error ? error.message : 'Unknown connector failure',
        } as Prisma.InputJsonValue,
      });

      await this.alertingService.raiseAlert({
        organizationId: request.organizationId,
        sourceModule: 'integrations',
        alertType: 'connector.action.failure',
        severity: 'WARNING',
        title: `Connector action failed: ${request.actionType}`,
        summary: error instanceof Error ? error.message : 'Unknown connector failure',
        metadata: {
          connectorInstanceId: request.connectorInstanceId,
          actionType: request.actionType,
          targetRef: request.targetRef ?? null,
        },
      });

      await this.incidentMonitorService.createReliabilityIncident({
        organizationId: request.organizationId,
        sourceModule: 'integrations',
        incidentType: 'CONNECTOR_ACTION_FAILURE',
        title: `Connector action failed for ${request.actionType}`,
        description: error instanceof Error ? error.message : 'Unknown connector failure',
        severity: 'MEDIUM',
        relatedEntityType: 'connector-instance',
        relatedEntityId: request.connectorInstanceId,
      });
      throw error;
    }
  }

  private toContext(instance: Awaited<ReturnType<ConnectorsRepository['findInstanceById']>>): ConnectorInstanceContext {
    if (!instance) {
      throw new NotFoundException('Connector instance not found.');
    }

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
