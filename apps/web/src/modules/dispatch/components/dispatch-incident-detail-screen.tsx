'use client';

import Link from 'next/link';

import { EntityMetaGrid } from '@/components/layout/entity-meta-grid';
import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { PermissionGate } from '@/components/layout/permission-gate';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDispatchAssignment, useDispatchIncident, useDispatchRun } from '@/hooks/queries/use-dispatch-assignments';
import { permissionLabels } from '@/lib/navigation';
import { formatDateTime } from '@/lib/utils';
import { DispatchIncidentForm } from '@/modules/dispatch/components/dispatch-incident-form';

export function DispatchIncidentDetailScreen({ id }: { id: string }) {
  const incident = useDispatchIncident(id);
  const run = useDispatchRun(incident.data?.runId ?? undefined);
  const assignment = useDispatchAssignment(incident.data?.assignmentId ?? undefined);
  if (incident.isLoading) return <LoadingState title="Loading operational issue..." description="Resolving issue severity, lifecycle state, and linked work order context." />;
  if (incident.isError || !incident.data) return <ErrorState title="Unable to load operational issue." onRetry={() => incident.refetch()} />;
  return <div className="space-y-6"><PageHeader eyebrow="Operational issue" title={incident.data.title} description="Issue review surface for operational disruption, safety events, and escalation." actions={<Link href="/operations/incidents" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">Back to issues</Link>} />
    <div className="flex items-center gap-3"><SeverityBadge value={incident.data.severity} /><StatusBadge value={incident.data.status} /></div>
    <EntityMetaGrid items={[
      { label: 'Issue code', value: incident.data.incidentCode },
      { label: 'Type', value: incident.data.incidentType.replaceAll('_',' ') },
      { label: 'Run', value: run.data?.workOrderId ?? incident.data.runId, href: run.data ? `/operations/runs/${run.data.id}` : undefined },
      { label: 'Assignment', value: assignment.data?.id ?? incident.data.assignmentId, href: assignment.data ? `/operations/assignments/${assignment.data.id}` : undefined },
      { label: 'Reported by', value: incident.data.reportedByUserId },
      { label: 'Reported at', value: formatDateTime(incident.data.reportedAt) },
      { label: 'Resolved at', value: incident.data.resolvedAt ? formatDateTime(incident.data.resolvedAt) : null },
      { label: 'Description', value: incident.data.description },
    ]} />
    <PermissionGate permission={permissionLabels.operationsIssueManage}><DispatchIncidentForm organizationId={incident.data.organizationId} incidentId={id} initialValues={{ organizationId: incident.data.organizationId, runId: incident.data.runId ?? '', assignmentId: incident.data.assignmentId ?? '', incidentCode: incident.data.incidentCode, incidentType: incident.data.incidentType, severity: incident.data.severity, title: incident.data.title, description: incident.data.description ?? '', status: incident.data.status, reportedByUserId: incident.data.reportedByUserId ?? '', reportedAt: incident.data.reportedAt.slice(0,16) }} /></PermissionGate>
  </div>;
}
