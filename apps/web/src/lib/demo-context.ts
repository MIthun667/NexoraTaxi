import { Organization } from '@/types/entities';

/**
 * Universal Platform Configuration for the AI Company Operating System.
 * All demo/industry-specific archetypes have been removed in favor of
 * this canonical enterprise-grade configuration.
 */
export type PlatformConfig = {
  archetype: 'UNIVERSAL';
  label: string;
  shortLabel: string;
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  contextSummary: string;
  highlightModules: string[];
  postureTitle: string;
  postureDescription: string;
  workforceTitle: string;
  workforceDescription: string;
  assetsTitle: string;
  assetsDescription: string;
  recentActivityTitle: string;
  recentActivityDescription: string;
  alertTitle: string;
  alertDescription: string;
  aiTitle: string;
  aiDescription: string;
  aiInsightTitles: [string, string, string, string];
};

/** @deprecated Use PLATFORM_CONFIG directly. */
export type DemoArchetype = 'UNIVERSAL';
/** @deprecated Use PlatformConfig directly. */
export type DemoArchetypeConfig = PlatformConfig;

export const PLATFORM_CONFIG: PlatformConfig = {
  archetype: 'UNIVERSAL',
  label: 'Company Operating System',
  shortLabel: 'Universal',
  eyebrow: 'Universal Command Surface',
  heroTitle: 'Unified Operational Posture',
  heroDescription:
    'Monitor company state across workforce, assets, operations, and governance using live intelligence.',
  contextSummary:
    'Real-time view of universal operating domains and AI-assisted governance.',
  highlightModules: ['Workforce', 'Assets', 'Operations', 'AI Runtime'],
  postureTitle: 'Company Health & Posture',
  postureDescription:
    'Topline signals representing operational readiness and organizational health.',
  workforceTitle: 'Workforce Performance',
  workforceDescription:
    'Availability, readiness, and performance signals across all workforce members.',
  assetsTitle: 'Asset Readiness',
  assetsDescription: 'Readiness, maintenance status, and asset lifecycle tracking.',
  recentActivityTitle: 'Operational Throughput',
  recentActivityDescription:
    'Live movement across work orders, assignments, and incident escalations.',
  alertTitle: 'Attention & Alerts',
  alertDescription: 'System-generated operational and governance alerts requiring review.',
  aiTitle: 'AI Operational Intelligence',
  aiDescription:
    'Predictive signals and risk insights derived from live operational telemetry.',
  aiInsightTitles: [
    'Execution Capacity Risk',
    'Escalation Probability',
    'Maintenance Impact',
    'Compliance & Governance Signal',
  ],
};

/**
 * Always returns the Universal archetype in production mode.
 * Archetype switching is no longer supported.
 */
export function detectDemoArchetype(
  _organization?: Pick<Organization, 'slug' | 'name'> | null,
): 'UNIVERSAL' {
  return 'UNIVERSAL';
}

export function getDemoArchetypeConfig(_archetype: string): PlatformConfig {
  return PLATFORM_CONFIG;
}
