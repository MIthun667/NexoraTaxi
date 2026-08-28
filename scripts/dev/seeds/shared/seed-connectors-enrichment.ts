import {
  ConnectorActionLogStatus,
  ConnectorAuthType,
  ConnectorCategory,
  ConnectorInstanceStatus,
  ConnectorSyncJobStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';

import { deterministicGlobalSeedUuid, deterministicPackUuid } from './deterministic-id';

export type ConnectorsEnrichmentProfile = 'saas' | 'logistics' | 'revops';

export type ConnectorsEnrichmentResult = {
  connectorDefinitions: number;
  connectorInstances: number;
  connectorCredentials: number;
  connectorSyncJobs: number;
  connectorActionLogs: number;
};

const CONNECTOR_DEFINITIONS = [
  {
    key: 'email',
    name: 'Demo Email Connector',
    category: ConnectorCategory.COMMUNICATION,
    authType: ConnectorAuthType.API_KEY,
    capabilities: ['sendMessage', 'sendTemplateMessage'],
  },
  {
    key: 'slack',
    name: 'Demo Team Messaging Connector',
    category: ConnectorCategory.COMMUNICATION,
    authType: ConnectorAuthType.BASIC_TOKEN,
    capabilities: ['postMessage', 'postAlert'],
  },
  {
    key: 'ops-reporting',
    name: 'Demo Operations Reporting Feed',
    category: ConnectorCategory.OPERATIONAL,
    authType: ConnectorAuthType.WEBHOOK_SECRET,
    capabilities: ['postOperationalSummary', 'ingestOperationalEvent'],
  },
  {
    key: 'crm',
    name: 'Demo CRM Connector',
    category: ConnectorCategory.BUSINESS_SYSTEM,
    authType: ConnectorAuthType.OAUTH2,
    capabilities: ['createLead', 'updateOpportunity', 'fetchAccounts'],
  },
  {
    key: 'marketing',
    name: 'Demo Marketing Automation Connector',
    category: ConnectorCategory.BUSINESS_SYSTEM,
    authType: ConnectorAuthType.API_KEY,
    capabilities: ['syncCampaignSignal', 'publishAudienceUpdate'],
  },
] as const;

const PROFILE_CONNECTORS: Record<
  ConnectorsEnrichmentProfile,
  Array<{
    key: string;
    displayName: string;
    configuration: Record<string, unknown>;
    createCredential?: boolean;
    syncJobType: string;
    syncJobSummary: string;
    actionType: string;
  }>
> = {
  saas: [
    {
      key: 'slack',
      displayName: 'SaaS Support Alerts',
      configuration: { defaultChannel: '#support-escalations' },
      createCredential: true,
      syncJobType: 'channelSync',
      syncJobSummary: 'Synchronized support escalation channels.',
      actionType: 'postAlert',
    },
    {
      key: 'email',
      displayName: 'SaaS Customer Email Delivery',
      configuration: { fromEmail: 'ops@northstar-saas.demo' },
      createCredential: true,
      syncJobType: 'templateSync',
      syncJobSummary: 'Synchronized customer issue email templates.',
      actionType: 'sendTemplateMessage',
    },
  ],
  logistics: [
    {
      key: 'ops-reporting',
      displayName: 'Logistics Operations Reporting',
      configuration: { reportGroup: 'daily-ops' },
      createCredential: true,
      syncJobType: 'ingestOperationalEvent',
      syncJobSummary: 'Ingested latest operational readiness events.',
      actionType: 'postOperationalSummary',
    },
    {
      key: 'email',
      displayName: 'Field Operations Email Delivery',
      configuration: { fromEmail: 'ops@helix-logistics.demo' },
      createCredential: false,
      syncJobType: 'templateSync',
      syncJobSummary: 'Synchronized field operations briefing templates.',
      actionType: 'sendMessage',
    },
  ],
  revops: [
    {
      key: 'crm',
      displayName: 'Revenue CRM Sync',
      configuration: { pipeline: 'enterprise-revenue' },
      createCredential: true,
      syncJobType: 'fetchAccounts',
      syncJobSummary: 'Fetched latest enterprise account and opportunity records.',
      actionType: 'updateOpportunity',
    },
    {
      key: 'marketing',
      displayName: 'Campaign Signal Sync',
      configuration: { workspace: 'demand-ops' },
      createCredential: true,
      syncJobType: 'syncCampaignSignal',
      syncJobSummary: 'Synchronized campaign quality signals for revenue operations.',
      actionType: 'publishAudienceUpdate',
    },
  ],
};

export const seedConnectorsEnrichment = async (
  prisma: PrismaClient,
  input: {
    packNamespace: string;
    organizationId: string;
    profile: ConnectorsEnrichmentProfile;
    now: Date;
    creatorUserId?: string | null;
    workOrderIds: string[];
    incidentIds: string[];
    assetIds: string[];
  },
): Promise<ConnectorsEnrichmentResult> => {
  await prisma.connectorDefinition.createMany({
    data: CONNECTOR_DEFINITIONS.map((definition) => ({
      id: deterministicGlobalSeedUuid(`connector-definition:${definition.key}`),
      key: definition.key,
      name: definition.name,
      category: definition.category,
      authType: definition.authType,
      capabilities: definition.capabilities as Prisma.InputJsonValue,
      isSystem: true,
    })),
    skipDuplicates: true,
  });

  const targetRefs = [...input.workOrderIds, ...input.incidentIds, ...input.assetIds];
  const instances = PROFILE_CONNECTORS[input.profile];

  const instanceRows = instances.map((instance) => ({
    id: deterministicPackUuid(input.packNamespace, `enrichment:connector-instance:${instance.key}`),
    organizationId: input.organizationId,
    connectorDefinitionId: deterministicGlobalSeedUuid(`connector-definition:${instance.key}`),
    displayName: instance.displayName,
    status: ConnectorInstanceStatus.ACTIVE,
    configuration: instance.configuration as Prisma.InputJsonValue,
    createdByUserId: input.creatorUserId ?? null,
  }));

  await prisma.connectorInstance.createMany({ data: instanceRows, skipDuplicates: true });

  const credentialRows = instances
    .filter((instance) => instance.createCredential)
    .map((instance) => ({
      id: deterministicPackUuid(input.packNamespace, `enrichment:connector-credential:${instance.key}`),
      connectorInstanceId: deterministicPackUuid(
        input.packNamespace,
        `enrichment:connector-instance:${instance.key}`,
      ),
      credentialType:
        CONNECTOR_DEFINITIONS.find((definition) => definition.key === instance.key)?.authType ??
        ConnectorAuthType.API_KEY,
      encryptedSecret: `demo-safe::${input.profile}::${instance.key}::credential`,
    }));

  if (credentialRows.length > 0) {
    await prisma.connectorCredential.createMany({ data: credentialRows, skipDuplicates: true });
  }

  const syncJobRows = instances.map((instance, index) => ({
    id: deterministicPackUuid(input.packNamespace, `enrichment:connector-sync:${instance.key}`),
    connectorInstanceId: deterministicPackUuid(
      input.packNamespace,
      `enrichment:connector-instance:${instance.key}`,
    ),
    jobType: instance.syncJobType,
    status: index % 3 === 0 ? ConnectorSyncJobStatus.PARTIAL : ConnectorSyncJobStatus.SUCCEEDED,
    startedAt: new Date(input.now.getTime() - (90 - index * 15) * 60 * 1000),
    finishedAt: new Date(input.now.getTime() - (88 - index * 15) * 60 * 1000),
    resultSummary: instance.syncJobSummary,
    metadata: {
      seeded: true,
      source: 'seed-pack-enrichment',
      profile: input.profile,
    } as Prisma.InputJsonValue,
  }));

  await prisma.connectorSyncJob.createMany({ data: syncJobRows, skipDuplicates: true });

  const actionLogRows = instances.map((instance, index) => ({
    id: deterministicPackUuid(input.packNamespace, `enrichment:connector-action:${instance.key}`),
    organizationId: input.organizationId,
    connectorInstanceId: deterministicPackUuid(
      input.packNamespace,
      `enrichment:connector-instance:${instance.key}`,
    ),
    actionType: instance.actionType,
    targetRef: targetRefs[index % Math.max(targetRefs.length, 1)] ?? null,
    requestPayload: {
      seeded: true,
      profile: input.profile,
      connector: instance.key,
    } as Prisma.InputJsonValue,
    responsePayload: {
      accepted: true,
      profile: input.profile,
    } as Prisma.InputJsonValue,
    status: index % 4 === 0 ? ConnectorActionLogStatus.FAILED : ConnectorActionLogStatus.SUCCEEDED,
    executedAt: new Date(input.now.getTime() - (30 - index * 10) * 60 * 1000),
  }));

  await prisma.connectorActionLog.createMany({ data: actionLogRows, skipDuplicates: true });

  return {
    connectorDefinitions: CONNECTOR_DEFINITIONS.length,
    connectorInstances: instanceRows.length,
    connectorCredentials: credentialRows.length,
    connectorSyncJobs: syncJobRows.length,
    connectorActionLogs: actionLogRows.length,
  };
};
