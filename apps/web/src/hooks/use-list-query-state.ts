'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useMemo } from 'react';

type QueryValue = string | number | boolean | undefined | null;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function useListQueryState(defaultLimit = 20) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigate = (href: string) => router.replace(href as Route);

  const query = useMemo(
    () => ({
      page: parsePositiveInt(searchParams.get('page'), 1),
      limit: parsePositiveInt(searchParams.get('limit'), defaultLimit),
      search: searchParams.get('search') ?? '',
      status: searchParams.get('status') ?? '',
      organizationId: searchParams.get('organizationId') ?? '',
      departmentId: searchParams.get('departmentId') ?? '',
      positionId: searchParams.get('positionId') ?? '',
      onboardingStatus: searchParams.get('onboardingStatus') ?? '',
      operationalStatus: searchParams.get('operationalStatus') ?? '',
      complianceStatus: searchParams.get('complianceStatus') ?? '',
      assignmentStatus: searchParams.get('assignmentStatus') ?? '',
      vehicleClass: searchParams.get('vehicleClass') ?? '',
      isActive: searchParams.get('isActive') ?? '',
      zoneId: searchParams.get('zoneId') ?? '',
      shiftId: searchParams.get('shiftId') ?? '',
      driverId: searchParams.get('driverId') ?? '',
      vehicleId: searchParams.get('vehicleId') ?? '',
      assignmentId: searchParams.get('assignmentId') ?? '',
      runId: searchParams.get('runId') ?? '',
      dispatchStatus: searchParams.get('dispatchStatus') ?? '',
      incidentType: searchParams.get('incidentType') ?? '',
      severity: searchParams.get('severity') ?? '',
      agentCode: searchParams.get('agentCode') ?? '',
    }),
    [defaultLimit, searchParams],
  );

  const updateQuery = (updates: Record<string, QueryValue>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        params.delete(key);
        return;
      }

      params.set(key, String(value));
    });

    startTransition(() => {
      navigate(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
    });
  };

  const resetQuery = (keys?: string[]) => {
    if (!keys || keys.length === 0) {
      startTransition(() => {
        navigate(pathname);
      });
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    keys.forEach((key) => params.delete(key));
    startTransition(() => {
      navigate(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
    });
  };

  return {
    query,
    updateQuery,
    resetQuery,
  };
}
