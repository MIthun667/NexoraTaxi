'use client';

import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { Select } from '@/components/ui/select';
import { TableToolbar } from '@/components/tables/table-toolbar';
import { usePolicyViolations } from '@/hooks/queries/use-ai-command-center';
import { useListQueryState } from '@/hooks/use-list-query-state';

import { PolicyViolationTable } from './policy-violation-table';

export function PolicyViolationsScreen() {
  const { query, updateQuery, resetQuery } = useListQueryState(12);
  const violations = usePolicyViolations({
    page: query.page,
    limit: query.limit,
    search: query.search || undefined,
  });

  if (violations.isLoading) {
    return (
      <LoadingState
        title="Loading policy violations..."
        description="Reviewing blocked actions, rule breaches, and escalated governance exceptions."
      />
    );
  }

  if (violations.isError) {
    return <ErrorState title="Unable to load policy violations." onRetry={() => violations.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI governance"
        title="Policy Violations"
        description="Investigate blocked actions, governance exceptions, and risky autonomous behavior before it spreads."
      />

      <TableToolbar
        searchValue={query.search}
        searchPlaceholder="Search by agent, violation type, or description"
        onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
        onReset={() => resetQuery(['search', 'page', 'severity'])}
        filters={
          <Select value={query.severity} className="w-[180px]" onChange={() => null}>
            <option value="">All severities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        }
      />

      <PolicyViolationTable items={violations.data?.items ?? []} meta={violations.data?.meta} />
    </div>
  );
}
