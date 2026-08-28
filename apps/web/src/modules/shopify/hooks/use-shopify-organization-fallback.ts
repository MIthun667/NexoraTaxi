'use client';

import type { Route } from 'next';
import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ApiClientError } from '@/lib/api-client';

type UseShopifyOrganizationFallbackInput = {
  organizationId?: string;
  userOrganizationId?: string;
  selectedScope: string;
  canSelectScope: boolean;
  setSelectedScope: (scope: string) => void;
  errors: Array<unknown>;
};

const RECOVERABLE_ERROR_CODES = new Set([
  'FORBIDDEN',
  'RESOURCE_NOT_FOUND',
  'organization_access_denied',
]);

function isRecoverableScopeError(error: unknown) {
  const errorCode = error instanceof ApiClientError ? error.code : undefined;

  return (
    Boolean(errorCode) &&
    RECOVERABLE_ERROR_CODES.has(errorCode as string)
  );
}

export function useShopifyOrganizationFallback({
  organizationId,
  userOrganizationId,
  selectedScope,
  canSelectScope,
  setSelectedScope,
  errors,
}: UseShopifyOrganizationFallbackInput) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasRecoveredRef = useRef(false);

  const shouldRecover = useMemo(() => {
    if (!canSelectScope || !organizationId || !userOrganizationId) {
      return false;
    }

    if (organizationId === userOrganizationId) {
      return false;
    }

    return errors.some(isRecoverableScopeError);
  }, [canSelectScope, errors, organizationId, userOrganizationId]);

  useEffect(() => {
    if (!shouldRecover || !userOrganizationId || hasRecoveredRef.current) {
      return;
    }

    hasRecoveredRef.current = true;

    if (selectedScope !== userOrganizationId) {
      setSelectedScope(userOrganizationId);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('organizationId', userOrganizationId);
    const nextQuery = nextParams.toString();
    router.replace((nextQuery ? `${pathname}?${nextQuery}` : pathname) as Route, { scroll: false });
  }, [
    pathname,
    router,
    searchParams,
    selectedScope,
    setSelectedScope,
    shouldRecover,
    userOrganizationId,
  ]);

  return shouldRecover;
}
