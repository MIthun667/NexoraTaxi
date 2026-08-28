'use client';

import { useEffect, useState } from 'react';

import { useOrganizations } from '@/hooks/queries/use-platform';
import {
  detectDemoArchetype,
  getDemoArchetypeConfig,
  type DemoArchetype,
  type PlatformConfig,
} from '@/lib/demo-context';
import { useAuth } from '@/hooks/use-auth';
import { Organization } from '@/types/entities';

const ACTIVE_SCOPE_STORAGE_KEY = 'nexora-active-scope';
const LEGACY_DEMO_SCOPE_STORAGE_KEY = 'nexora-demo-scope';
const ALL_SCOPE = 'all';

export type DemoScopeOption = {
  value: string;
  label: string;
  description: string;
};

/**
 * @deprecated Prefer organization-scoped hooks for all new work.
 * This hook is maintained for compatibility while moving from demo to universal mode.
 */
export function useDemoContext(): {
  isLoading: boolean;
  organizations: Organization[];
  selectedScope: string;
  selectedOrganizationId?: string;
  selectedOrganization: Organization | null;
  selectedArchetype: DemoArchetype;
  config: PlatformConfig;
  canSelectScope: boolean;
  scopeOptions: DemoScopeOption[];
  availableArchetypes: DemoArchetype[];
  scopeLabel: string;
  setSelectedScope: (scope: string) => void;
} {
  const { user } = useAuth();
  const organizationsQuery = useOrganizations({ page: 1, limit: 25 });
  const organizations = organizationsQuery.data?.items ?? [];
  const [storedScope, setStoredScope] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextScope =
      window.localStorage.getItem(ACTIVE_SCOPE_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_DEMO_SCOPE_STORAGE_KEY) ??
      '';

    setStoredScope(nextScope);
  }, []);

  const fallbackScope = user?.organizationId ?? organizations[0]?.id ?? ALL_SCOPE;
  const scopeExists =
    storedScope === ALL_SCOPE ||
    organizations.some((organization) => organization.id === storedScope);
  const selectedScope = storedScope && scopeExists ? storedScope : fallbackScope;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(ACTIVE_SCOPE_STORAGE_KEY, selectedScope);
  }, [selectedScope]);

  const selectedOrganizationId = selectedScope === ALL_SCOPE ? undefined : selectedScope;
  const selectedOrganization =
    organizations.find((organization) => organization.id === selectedOrganizationId) ?? null;
  
  // All archetypes are now canonical UNIVERSAL in the underlying lib
  const selectedArchetype = detectDemoArchetype(selectedOrganization);
  const config = getDemoArchetypeConfig(selectedArchetype);

  const canSelectScope = organizations.length > 1;

  const scopeOptions: DemoScopeOption[] = [
    ...(canSelectScope
      ? [
          {
            value: ALL_SCOPE,
            label: 'All Organizations',
            description: 'Global operational overview',
          },
        ]
      : []),
    ...organizations.map((organization) => {
      return {
        value: organization.id,
        label: organization.name,
        description: 'Organization Profile',
      };
    }),
  ];

  return {
    isLoading: organizationsQuery.isLoading,
    organizations,
    selectedScope,
    selectedOrganizationId,
    selectedOrganization,
    selectedArchetype,
    config,
    canSelectScope,
    scopeOptions,
    availableArchetypes: ['UNIVERSAL'],
    scopeLabel:
      selectedOrganization?.name ??
      (canSelectScope ? 'All Organizations' : 'Universal Platform'),
    setSelectedScope(scope: string) {
      setStoredScope(scope);
    },
  };
}
