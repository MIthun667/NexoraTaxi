import { Prisma, PrismaClient } from '@prisma/client';

import { CORE_UNIVERSAL_BLUEPRINT } from '../scripts/dev/seeds/core/seed-core-universal';
import { LOGISTICS_COMPANY_BLUEPRINT } from '../scripts/dev/seeds/archetypes/seed-logistics-company';
import { REVOPS_COMPANY_BLUEPRINT } from '../scripts/dev/seeds/archetypes/seed-revops-company';
import { SAAS_COMPANY_BLUEPRINT } from '../scripts/dev/seeds/archetypes/seed-saas-company';
import {
  ensureBaseAccessControl,
  seedCompanyPack,
  type PackSeedSummary,
  type SeedFeatureAvailability,
  type SeedPackKey,
} from '../scripts/dev/seeds/shared/seed-helpers';

const prisma = new PrismaClient();
const DEMO_REFERENCE_DATE = new Date('2026-03-14T08:00:00.000Z');

type SeedMode = 'reset' | 'append';

const seedMode = (): SeedMode => (process.env.SEED_MODE === 'append' ? 'append' : 'reset');

const seedPack = (): SeedPackKey => {
  const requested = process.env.SEED_PACK?.toUpperCase();

  switch (requested) {
    case 'CORE_ONLY':
    case 'SAAS':
    case 'LOGISTICS':
    case 'REVOPS':
    case 'ALL':
      return requested;
    default:
      return 'ALL';
  }
};

const tableExists = async (tableName: string): Promise<boolean> => {
  const result = await prisma.$queryRaw<Array<{ exists: string | null }>>(
    Prisma.sql`SELECT to_regclass(${`public.${tableName}`})::text AS exists`,
  );

  return Boolean(result[0]?.exists);
};

const tablesExist = async (tableNames: string[]): Promise<boolean> => {
  for (const tableName of tableNames) {
    if (!(await tableExists(tableName))) {
      return false;
    }
  }

  return true;
};

const assertSeedSafety = (): void => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('Refusing to seed production without ALLOW_PRODUCTION_SEED=true');
  }
};

const resetDatabase = async (): Promise<void> => {
  process.stdout.write('Resetting existing development data...\n');
  const knownTables = [
    'trigger_execution_logs',
    'action_execution_logs',
    'connector_action_logs',
    'connector_sync_jobs',
    'connector_credentials',
    'connector_instances',
    'connector_definitions',
    'organization_billing_events',
    'organization_usage',
    'organization_subscriptions',
    'subscription_plans',
    'health_check_logs',
    'system_alerts',
    'agent_policy_violations',
    'agent_operational_impacts',
    'agent_execution_metrics',
    'agent_evaluation_results',
    'agent_feedback',
    'agent_verification_results',
    'agent_action_proposals',
    'decision_reports',
    'agent_decisions',
    'agent_observations',
    'inference_audit_logs',
    'agent_runs',
    'agent_policy_rules',
    'agent_definitions',
    'notifications',
    'domain_events',
    'trigger_rules',
    'incident_actions',
    'operational_incidents',
    'resource_assignments',
    'asset_maintenance_records',
    'asset_status_history',
    'workforce_authorizations',
    'credential_documents',
    'workforce_status_history',
    'workforce_profile_extensions',
    'schedule_shifts',
    'schedule_plans',
    'work_orders',
    'assets',
    'workforce_members',
    'operational_zones',
    'dispatch_incidents',
    'dispatch_runs',
    'driver_vehicle_assignments',
    'dispatch_shifts',
    'dispatch_zones',
    'fleet_status_history',
    'fleet_maintenance_records',
    'fleet_vehicles',
    'driver_status_history',
    'driver_documents',
    'drivers',
    'approval_decisions',
    'approval_steps',
    'approval_requests',
    'task_actions',
    'workflow_tasks',
    'workflow_instances',
    'escalation_rules',
    'workflow_definitions',
    'audit_logs',
    'role_permissions',
    'user_roles',
    'employees',
    'users',
    'permissions',
    'roles',
    'positions',
    'departments',
    'organizations',
  ];

  const existingTables: string[] = [];

  for (const tableName of knownTables) {
    if (await tableExists(tableName)) {
      existingTables.push(`public.${tableName}`);
    }
  }

  if (existingTables.length === 0) {
    return;
  }

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${existingTables.join(', ')} RESTART IDENTITY CASCADE`,
  );
};

const determineFeatureAvailability = async (): Promise<SeedFeatureAvailability> => ({
  workforce: await tablesExist(['workforce_members', 'credential_documents', 'workforce_status_history']),
  workforceExtensions: await tablesExist(['workforce_profile_extensions', 'workforce_authorizations']),
  workflows: await tablesExist([
    'workflow_definitions',
    'workflow_instances',
    'workflow_tasks',
    'task_actions',
    'approval_requests',
    'approval_steps',
    'approval_decisions',
  ]),
  workOrders: await tablesExist(['work_orders']),
  assets: await tablesExist(['assets']),
  incidents: await tablesExist(['operational_incidents', 'incident_actions']),
  notifications: await tablesExist(['notifications']),
  domainEvents: await tablesExist(['domain_events']),
  zones: await tablesExist(['operational_zones']),
  tenancy: await tablesExist([
    'subscription_plans',
    'organization_subscriptions',
    'organization_usage',
    'organization_billing_events',
  ]),
  connectors: await tablesExist([
    'connector_definitions',
    'connector_instances',
    'connector_credentials',
    'connector_sync_jobs',
    'connector_action_logs',
  ]),
  observability: await tablesExist(['system_alerts', 'health_check_logs']),
  aiPlatform: await tablesExist([
    'agent_definitions',
    'agent_policy_rules',
    'agent_runs',
    'agent_decisions',
    'agent_action_proposals',
    'agent_verification_results',
    'decision_reports',
    'trigger_rules',
    'trigger_execution_logs',
    'action_execution_logs',
  ]),
});

const selectedBlueprints = (requestedPack: SeedPackKey) => {
  const archetypes = [SAAS_COMPANY_BLUEPRINT, LOGISTICS_COMPANY_BLUEPRINT, REVOPS_COMPANY_BLUEPRINT];

  switch (requestedPack) {
    case 'CORE_ONLY':
      return [CORE_UNIVERSAL_BLUEPRINT];
    case 'SAAS':
      return [CORE_UNIVERSAL_BLUEPRINT, SAAS_COMPANY_BLUEPRINT];
    case 'LOGISTICS':
      return [CORE_UNIVERSAL_BLUEPRINT, LOGISTICS_COMPANY_BLUEPRINT];
    case 'REVOPS':
      return [CORE_UNIVERSAL_BLUEPRINT, REVOPS_COMPANY_BLUEPRINT];
    case 'ALL':
    default:
      return [CORE_UNIVERSAL_BLUEPRINT, ...archetypes];
  }
};

const summarizeTotals = (packSummaries: PackSeedSummary[]) =>
  packSummaries.reduce(
    (totals, pack) => ({
      organizations: totals.organizations + pack.organizations,
      departments: totals.departments + pack.departments,
      positions: totals.positions + pack.positions,
      users: totals.users + pack.users,
      employees: totals.employees + pack.employees,
      workforce: totals.workforce + pack.workforce,
      workflowDefinitions: totals.workflowDefinitions + pack.workflowDefinitions,
      workflowInstances: totals.workflowInstances + pack.workflowInstances,
      workflowTasks: totals.workflowTasks + pack.workflowTasks,
      approvalRequests: totals.approvalRequests + pack.approvalRequests,
      approvalSteps: totals.approvalSteps + pack.approvalSteps,
      approvalDecisions: totals.approvalDecisions + pack.approvalDecisions,
      workOrders: totals.workOrders + pack.workOrders,
      assets: totals.assets + pack.assets,
      incidents: totals.incidents + pack.incidents,
      incidentActions: totals.incidentActions + pack.incidentActions,
      notifications: totals.notifications + pack.notifications,
      domainEvents: totals.domainEvents + pack.domainEvents,
      zones: totals.zones + pack.zones,
      workforceProfileExtensions:
        totals.workforceProfileExtensions + pack.workforceProfileExtensions,
      workforceAuthorizations:
        totals.workforceAuthorizations + pack.workforceAuthorizations,
      tenancy: {
        subscriptionPlans:
          totals.tenancy.subscriptionPlans + pack.enrichments.tenancy.subscriptionPlans,
        organizationSubscriptions:
          totals.tenancy.organizationSubscriptions +
          pack.enrichments.tenancy.organizationSubscriptions,
        organizationUsage:
          totals.tenancy.organizationUsage + pack.enrichments.tenancy.organizationUsage,
        organizationBillingEvents:
          totals.tenancy.organizationBillingEvents +
          pack.enrichments.tenancy.organizationBillingEvents,
      },
      connectors: {
        connectorDefinitions:
          totals.connectors.connectorDefinitions +
          pack.enrichments.connectors.connectorDefinitions,
        connectorInstances:
          totals.connectors.connectorInstances + pack.enrichments.connectors.connectorInstances,
        connectorCredentials:
          totals.connectors.connectorCredentials +
          pack.enrichments.connectors.connectorCredentials,
        connectorSyncJobs:
          totals.connectors.connectorSyncJobs + pack.enrichments.connectors.connectorSyncJobs,
        connectorActionLogs:
          totals.connectors.connectorActionLogs +
          pack.enrichments.connectors.connectorActionLogs,
      },
      observability: {
        systemAlerts:
          totals.observability.systemAlerts + pack.enrichments.observability.systemAlerts,
        healthCheckLogs:
          totals.observability.healthCheckLogs + pack.enrichments.observability.healthCheckLogs,
      },
      aiPlatform: {
        agentDefinitions:
          totals.aiPlatform.agentDefinitions + pack.enrichments.aiPlatform.agentDefinitions,
        agentPolicyRules:
          totals.aiPlatform.agentPolicyRules + pack.enrichments.aiPlatform.agentPolicyRules,
        agentRuns: totals.aiPlatform.agentRuns + pack.enrichments.aiPlatform.agentRuns,
        agentDecisions:
          totals.aiPlatform.agentDecisions + pack.enrichments.aiPlatform.agentDecisions,
        agentActionProposals:
          totals.aiPlatform.agentActionProposals +
          pack.enrichments.aiPlatform.agentActionProposals,
        agentVerificationResults:
          totals.aiPlatform.agentVerificationResults +
          pack.enrichments.aiPlatform.agentVerificationResults,
        decisionReports:
          totals.aiPlatform.decisionReports + pack.enrichments.aiPlatform.decisionReports,
        triggerRules:
          totals.aiPlatform.triggerRules + pack.enrichments.aiPlatform.triggerRules,
        triggerExecutionLogs:
          totals.aiPlatform.triggerExecutionLogs +
          pack.enrichments.aiPlatform.triggerExecutionLogs,
        actionExecutionLogs:
          totals.aiPlatform.actionExecutionLogs +
          pack.enrichments.aiPlatform.actionExecutionLogs,
      },
    }),
    {
      organizations: 0,
      departments: 0,
      positions: 0,
      users: 0,
      employees: 0,
      workforce: 0,
      workflowDefinitions: 0,
      workflowInstances: 0,
      workflowTasks: 0,
      approvalRequests: 0,
      approvalSteps: 0,
      approvalDecisions: 0,
      workOrders: 0,
      assets: 0,
      incidents: 0,
      incidentActions: 0,
      notifications: 0,
      domainEvents: 0,
      zones: 0,
      workforceProfileExtensions: 0,
      workforceAuthorizations: 0,
      tenancy: {
        subscriptionPlans: 0,
        organizationSubscriptions: 0,
        organizationUsage: 0,
        organizationBillingEvents: 0,
      },
      connectors: {
        connectorDefinitions: 0,
        connectorInstances: 0,
        connectorCredentials: 0,
        connectorSyncJobs: 0,
        connectorActionLogs: 0,
      },
      observability: {
        systemAlerts: 0,
        healthCheckLogs: 0,
      },
      aiPlatform: {
        agentDefinitions: 0,
        agentPolicyRules: 0,
        agentRuns: 0,
        agentDecisions: 0,
        agentActionProposals: 0,
        agentVerificationResults: 0,
        decisionReports: 0,
        triggerRules: 0,
        triggerExecutionLogs: 0,
        actionExecutionLogs: 0,
      },
    },
  );

const seedDatabase = async (): Promise<void> => {
  assertSeedSafety();

  const mode = seedMode();
  const requestedPack = seedPack();

  if (mode === 'reset') {
    await resetDatabase();
  }

  await ensureBaseAccessControl(prisma);

  const featureAvailability = await determineFeatureAvailability();
  const blueprints = selectedBlueprints(requestedPack);
  const packSummaries: PackSeedSummary[] = [];

  for (const blueprint of blueprints) {
    process.stdout.write(`Seeding pack ${blueprint.packKey} (${blueprint.organization.slug})...\n`);
    packSummaries.push(
      await seedCompanyPack(prisma, blueprint, featureAvailability, DEMO_REFERENCE_DATE),
    );
  }

  const totals = summarizeTotals(packSummaries);

  process.stdout.write('Multi-vertical universal AI Company OS seed completed successfully.\n');
  process.stdout.write(
    `${JSON.stringify(
      {
        mode,
        seedPack: requestedPack,
        packs: packSummaries,
        totals,
        featureAvailability,
      },
      null,
      2,
    )}\n`,
  );
};

async function main(): Promise<void> {
  await seedDatabase();
}

void main()
  .catch(async (error) => {
    process.stderr.write(
      `Seed execution failed: ${error instanceof Error ? error.stack ?? error.message : error}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
