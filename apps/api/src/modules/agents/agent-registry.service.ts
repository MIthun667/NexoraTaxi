import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AgentCategory, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { COMMERCE_AGENT_DEFINITIONS } from './commerce-agent.constants';

interface RegisteredAgentDefinition {
  category: AgentCategory;
  code: string;
  description: string;
  isActive: boolean;
  name: string;
  supportedTriggers: string[];
  version: number;
}

const registeredDefinitions: RegisteredAgentDefinition[] = [
  {
    code: 'commerce_health_agent',
    name: 'Commerce Health Agent',
    description:
      'Synthesizes store health, trust posture, and top operational concerns for bounded operator review.',
    category: AgentCategory.SYSTEM,
    isActive: true,
    supportedTriggers: ['manual-run', 'shopify_sync_completed', 'scheduled', 'execution_followup'],
    version: 1,
  },
  {
    code: 'revenue_monitor_agent',
    name: 'Revenue Monitor Agent',
    description:
      'Monitors revenue and order movement, then surfaces grounded revenue-focused follow-up.',
    category: AgentCategory.SYSTEM,
    isActive: true,
    supportedTriggers: ['manual-run', 'shopify_sync_completed', 'scheduled', 'signal_triggered'],
    version: 1,
  },
  {
    code: 'customer_momentum_agent',
    name: 'Customer Momentum Agent',
    description:
      'Monitors customer activity and momentum, then surfaces bounded customer-focused advisory outputs.',
    category: AgentCategory.SYSTEM,
    isActive: true,
    supportedTriggers: ['manual-run', 'shopify_sync_completed', 'scheduled', 'signal_triggered'],
    version: 1,
  },
  {
    code: 'integration_guard_agent',
    name: 'Integration Guard Agent',
    description:
      'Monitors Shopify and payments connectivity, sync freshness, and visibility gaps before operators act.',
    category: AgentCategory.SYSTEM,
    isActive: true,
    supportedTriggers: ['manual-run', 'shopify_sync_completed', 'scheduled', 'stripe_not_connected', 'data_restriction_detected'],
    version: 1,
  },
  {
    code: 'operations-summary-agent',
    name: 'Operations Summary Agent',
    description: 'Generates bounded operational summaries and recommended next actions.',
    category: AgentCategory.OPERATIONS,
    isActive: true,
    supportedTriggers: ['manual-run', 'dashboard-refresh', 'scheduled'],
    version: 1,
  },
  {
    code: 'approval-assistant-agent',
    name: 'Approval Assistant Agent',
    description: 'Reviews approval context and recommends an operational decision posture.',
    category: AgentCategory.APPROVALS,
    isActive: true,
    supportedTriggers: ['manual-run', 'threshold-event'],
    version: 1,
  },
  {
    code: 'dispatch-risk-agent',
    name: 'Operations Risk Agent',
    description: 'Evaluates operations pressure, incidents, and readiness risks.',
    category: AgentCategory.DISPATCH,
    isActive: true,
    supportedTriggers: ['manual-run', 'threshold-event', 'scheduled'],
    version: 1,
  },
  {
    code: 'driver-oversight-agent',
    name: 'Operator Oversight Agent',
    description: 'Evaluates operator compliance and operational eligibility concerns.',
    category: AgentCategory.DRIVERS,
    isActive: true,
    supportedTriggers: ['manual-run', 'threshold-event'],
    version: 1,
  },
  {
    code: 'fleet-compliance-agent',
    name: 'Asset Compliance Agent',
    description: 'Evaluates asset readiness, compliance posture, and maintenance risk.',
    category: AgentCategory.FLEET,
    isActive: true,
    supportedTriggers: ['manual-run', 'threshold-event'],
    version: 1,
  },
  {
    code: 'workforce-readiness-agent',
    name: 'Hiring and Workforce Agent',
    description:
      'Detects staffing pressure, onboarding drag, and workforce readiness risks, then proposes reviewable workforce actions.',
    category: AgentCategory.SYSTEM,
    isActive: true,
    supportedTriggers: ['manual-run', 'dashboard-refresh', 'scheduled', 'threshold-event'],
    version: 1,
  },
  {
    code: 'operations-control-agent',
    name: 'Operations Agent',
    description:
      'Summarizes operational pressure, incident load, and readiness gaps and proposes bounded operational follow-up.',
    category: AgentCategory.OPERATIONS,
    isActive: true,
    supportedTriggers: ['manual-run', 'dashboard-refresh', 'scheduled', 'threshold-event'],
    version: 1,
  },
  {
    code: 'revenue-operations-agent',
    name: 'Revenue and RevOps Agent',
    description:
      'Detects approval bottlenecks, stalled workflow decisions, and connector freshness pressure in revenue-oriented operating flows.',
    category: AgentCategory.APPROVALS,
    isActive: true,
    supportedTriggers: ['manual-run', 'dashboard-refresh', 'scheduled', 'threshold-event'],
    version: 1,
  },
];

const agentDefinitionSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  category: true,
  isActive: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AgentDefinitionSelect;

const definitionMetadataByCode = new Map(
  registeredDefinitions.map((definition) => [
    definition.code,
    {
      supportedTriggers: definition.supportedTriggers,
    },
  ]),
);

@Injectable()
export class AgentRegistryService implements OnModuleInit {
  private readonly logger = new Logger(AgentRegistryService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    if (!this.prismaService.isDatabaseAvailable()) {
      this.logger.warn(
        'Skipping agent definition registration because the database is unavailable during startup.',
      );
      return;
    }

    for (const definition of registeredDefinitions) {
      await this.prismaService.agentDefinition.upsert({
        where: { code: definition.code },
        create: {
          code: definition.code,
          name: definition.name,
          description: definition.description,
          category: definition.category,
          isActive: definition.isActive,
          version: definition.version,
        },
        update: {
          category: definition.category,
          description: definition.description,
          isActive: definition.isActive,
          name: definition.name,
          version: definition.version,
        },
      });
    }
  }

  listDefinitions(where: Prisma.AgentDefinitionWhereInput = {}) {
    return this.prismaService.agentDefinition.findMany({
      where,
      select: agentDefinitionSelect,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }).then((definitions) =>
      definitions.map((definition) => ({
        ...definition,
        supportedTriggers:
          definitionMetadataByCode.get(definition.code)?.supportedTriggers ?? [],
      })),
    );
  }

  async getDefinitionById(id: string) {
    const definition = await this.prismaService.agentDefinition.findUnique({
      where: { id },
      select: agentDefinitionSelect,
    });

    if (!definition) {
      throw new NotFoundException('Agent definition not found.');
    }

    return {
      ...definition,
      supportedTriggers:
        definitionMetadataByCode.get(definition.code)?.supportedTriggers ?? [],
    };
  }

  async resolveActiveDefinitionByCode(code: string) {
    const definition = await this.prismaService.agentDefinition.findUnique({
      where: { code },
      select: agentDefinitionSelect,
    });

    if (!definition) {
      throw new NotFoundException('Agent definition not found.');
    }

    if (!definition.isActive) {
      throw new NotFoundException('Agent definition is not active.');
    }

    return {
      ...definition,
      supportedTriggers:
        definitionMetadataByCode.get(definition.code)?.supportedTriggers ?? [],
    };
  }

  getCommerceDefinitionMetadata(code: string) {
    const definition = COMMERCE_AGENT_DEFINITIONS.find((item) => item.code === code);

    return definition
      ? {
          key: definition.key,
          domain: definition.domain,
          capabilities: [...definition.capabilities],
          status: 'active' as const,
        }
      : null;
  }
}
