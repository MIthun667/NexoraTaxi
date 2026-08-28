export const COMMERCE_AGENT_DEFINITIONS = [
  {
    key: 'commerce_health_agent',
    code: 'commerce_health_agent',
    name: 'Commerce Health Agent',
    domain: 'commerce',
    description:
      'Synthesizes store health, trust posture, and top operational concerns for bounded operator review.',
    capabilities: [
      'store_health_synthesis',
      'trust_aware_summary',
      'bounded_follow_up_generation',
    ],
    supportedTriggers: ['manual-run', 'scheduled', 'shopify_sync_completed', 'execution_followup'],
  },
  {
    key: 'revenue_monitor_agent',
    code: 'revenue_monitor_agent',
    name: 'Revenue Monitor Agent',
    domain: 'revenue',
    description:
      'Monitors revenue and order movement, then surfaces grounded revenue-focused follow-up.',
    capabilities: [
      'revenue_change_detection',
      'demand_shift_review',
      'revenue_proposal_generation',
    ],
    supportedTriggers: ['manual-run', 'scheduled', 'shopify_sync_completed', 'signal_triggered'],
  },
  {
    key: 'customer_momentum_agent',
    code: 'customer_momentum_agent',
    name: 'Customer Momentum Agent',
    domain: 'customers',
    description:
      'Monitors customer activity and momentum, then surfaces bounded customer-focused advisory outputs.',
    capabilities: [
      'customer_momentum_tracking',
      'customer_slowdown_review',
      'retention_follow_up_generation',
    ],
    supportedTriggers: ['manual-run', 'scheduled', 'shopify_sync_completed', 'signal_triggered'],
  },
  {
    key: 'integration_guard_agent',
    code: 'integration_guard_agent',
    name: 'Integration Guard Agent',
    domain: 'integrations',
    description:
      'Monitors Shopify and payments connectivity, sync freshness, and visibility gaps before operators act.',
    capabilities: [
      'integration_health_monitoring',
      'sync_recovery_guidance',
      'visibility_gap_escalation',
    ],
    supportedTriggers: [
      'manual-run',
      'scheduled',
      'shopify_sync_completed',
      'stripe_not_connected',
      'data_restriction_detected',
    ],
  },
] as const;

export const COMMERCE_AGENT_KEYS = COMMERCE_AGENT_DEFINITIONS.map(
  (definition) => definition.key,
);

export type CommerceAgentKey = (typeof COMMERCE_AGENT_KEYS)[number];
export type CommerceAgentDomain =
  (typeof COMMERCE_AGENT_DEFINITIONS)[number]['domain'];

export function isCommerceAgentKey(value: string): value is CommerceAgentKey {
  return COMMERCE_AGENT_KEYS.includes(value as CommerceAgentKey);
}

export function getCommerceAgentDefinition(key: string) {
  return COMMERCE_AGENT_DEFINITIONS.find((definition) => definition.key === key);
}
