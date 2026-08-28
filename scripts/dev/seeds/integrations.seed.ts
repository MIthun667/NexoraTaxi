import {
  ConnectorActionLogStatus,
  ConnectorAuthType,
  ConnectorCategory,
  ConnectorInstanceStatus,
  ConnectorSyncJobStatus,
  Prisma,
} from '@prisma/client';

import { seededPick } from './helpers';
import { deterministicUuid } from '../seed/utils';
import type { CoreSeedContext, IntegrationSeedResult, SeedUser } from './types';

export const seedIntegrations = async (
  context: CoreSeedContext & {
    users: SeedUser[];
    workOrderIds: string[];
    incidentIds: string[];
    assetIds: string[];
  },
): Promise<IntegrationSeedResult> => {
  const definitions = [
    {
      id: deterministicUuid('connector-definition:email'),
      key: 'email',
      name: 'Mock Email Connector',
      category: ConnectorCategory.COMMUNICATION,
      authType: ConnectorAuthType.API_KEY,
      capabilities: ['sendMessage', 'sendTemplateMessage'],
    },
    {
      id: deterministicUuid('connector-definition:slack'),
      key: 'slack',
      name: 'Mock Slack Connector',
      category: ConnectorCategory.COMMUNICATION,
      authType: ConnectorAuthType.BASIC_TOKEN,
      capabilities: ['postMessage', 'postAlert'],
    },
    {
      id: deterministicUuid('connector-definition:webhook'),
      key: 'webhook',
      name: 'Mock Webhook Feed',
      category: ConnectorCategory.OPERATIONAL,
      authType: ConnectorAuthType.WEBHOOK_SECRET,
      capabilities: ['receiveInboundWebhook', 'postOutboundWebhook'],
    },
    {
      id: deterministicUuid('connector-definition:crm'),
      key: 'crm',
      name: 'Mock CRM Connector',
      category: ConnectorCategory.BUSINESS_SYSTEM,
      authType: ConnectorAuthType.OAUTH2,
      capabilities: ['createLead', 'updateOpportunity', 'fetchAccounts'],
    },
  ];

  await context.prisma.connectorDefinition.createMany({
    data: definitions.map((definition) => ({
      ...definition,
      capabilities: definition.capabilities as Prisma.InputJsonValue,
      isSystem: true,
    })),
    skipDuplicates: true,
  });

  const creatorId = context.users[0]?.id ?? null;
  const instances = [
    {
      id: deterministicUuid('connector-instance:email:demo'),
      connectorDefinitionId: definitions[0].id,
      displayName: 'Demo Email Delivery',
      configuration: { fromEmail: 'ops@nexorademo.com' },
    },
    {
      id: deterministicUuid('connector-instance:slack:demo'),
      connectorDefinitionId: definitions[1].id,
      displayName: 'Demo Slack Ops Alerts',
      configuration: { defaultChannel: '#ops-demo' },
    },
    {
      id: deterministicUuid('connector-instance:webhook:demo'),
      connectorDefinitionId: definitions[2].id,
      displayName: 'Demo External Webhook Feed',
      configuration: { source: 'demo-simulator' },
    },
    {
      id: deterministicUuid('connector-instance:crm:demo'),
      connectorDefinitionId: definitions[3].id,
      displayName: 'Demo CRM Sync',
      configuration: { pipeline: 'Enterprise Ops' },
    },
  ];

  await context.prisma.connectorInstance.createMany({
    data: instances.map((instance) => ({
      id: instance.id,
      organizationId: context.organizationId,
      connectorDefinitionId: instance.connectorDefinitionId,
      displayName: instance.displayName,
      status: ConnectorInstanceStatus.ACTIVE,
      configuration: instance.configuration as Prisma.InputJsonValue,
      createdByUserId: creatorId,
    })),
    skipDuplicates: true,
  });

  const credentials = instances.map((instance, index) => ({
    id: deterministicUuid(`connector-credential:${instance.id}`),
    connectorInstanceId: instance.id,
    credentialType: definitions[index].authType,
    encryptedSecret: `demo.${instance.id}.secret`,
  }));

  await context.prisma.connectorCredential.createMany({
    data: credentials,
    skipDuplicates: true,
  });

  const syncJobs = [
    {
      id: deterministicUuid('connector-sync:crm:1'),
      connectorInstanceId: instances[3].id,
      jobType: 'fetchAccounts',
      status: ConnectorSyncJobStatus.SUCCEEDED,
      startedAt: new Date(context.now.getTime() - 1000 * 60 * 90),
      finishedAt: new Date(context.now.getTime() - 1000 * 60 * 88),
      resultSummary: 'Imported 12 demo CRM accounts.',
    },
    {
      id: deterministicUuid('connector-sync:webhook:1'),
      connectorInstanceId: instances[2].id,
      jobType: 'ingestEvents',
      status: ConnectorSyncJobStatus.SUCCEEDED,
      startedAt: new Date(context.now.getTime() - 1000 * 60 * 40),
      finishedAt: new Date(context.now.getTime() - 1000 * 60 * 39),
      resultSummary: 'Processed 6 external webhook events.',
    },
  ];

  await context.prisma.connectorSyncJob.createMany({
    data: syncJobs,
    skipDuplicates: true,
  });

  const actionLogs = Array.from({ length: 14 }, (_, index) => {
    const instance = seededPick(instances, `connector-action-instance:${index}`);
    const targetPool = [...context.workOrderIds, ...context.incidentIds, ...context.assetIds];
    return {
      id: deterministicUuid(`connector-action-log:${index + 1}`),
      organizationId: context.organizationId,
      connectorInstanceId: instance.id,
      actionType:
        instance.id === instances[0].id
          ? 'sendMessage'
          : instance.id === instances[1].id
            ? 'postAlert'
            : instance.id === instances[2].id
              ? 'postOutboundWebhook'
              : 'updateOpportunity',
      targetRef: seededPick(targetPool, `connector-action-target:${index}`),
      requestPayload: { demo: true, index } as Prisma.InputJsonValue,
      responsePayload: { accepted: true, externalRef: `ext-${index + 1}` } as Prisma.InputJsonValue,
      status: index % 7 === 0 ? ConnectorActionLogStatus.FAILED : ConnectorActionLogStatus.SUCCEEDED,
      executedAt: new Date(context.now.getTime() - index * 1000 * 60 * 15),
    };
  });

  await context.prisma.connectorActionLog.createMany({
    data: actionLogs,
    skipDuplicates: true,
  });

  return {
    connectorDefinitions: definitions.length,
    connectorInstances: instances.length,
    connectorCredentials: credentials.length,
    connectorSyncJobs: syncJobs.length,
    connectorActionLogs: actionLogs.length,
  };
};
