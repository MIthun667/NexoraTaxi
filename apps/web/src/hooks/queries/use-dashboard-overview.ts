'use client';

import { useQuery } from '@tanstack/react-query';

import { ApiClientError } from '@/lib/api-client';
import { dashboardService } from '@/services/dashboard.service';

export function useDashboardOverview(organizationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'overview', organizationId],
    queryFn: () => dashboardService.overview(organizationId),
  });
}

export function useDashboardOperatorsSummary(organizationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'operators-summary', organizationId],
    queryFn: () => dashboardService.operatorsSummary(organizationId),
  });
}

export function useDashboardWorkforceSummary(organizationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'workforce-summary', organizationId],
    queryFn: () => dashboardService.workforceSummary(organizationId),
  });
}

export function useDashboardAssetsSummary(organizationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'assets-summary', organizationId],
    queryFn: () => dashboardService.assetsSummary(organizationId),
  });
}

export function useDashboardOperationsSummary(organizationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'operations-summary', organizationId],
    queryFn: () => dashboardService.operationsSummary(organizationId),
  });
}

export function useDashboardApprovalsSummary(organizationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'approvals-summary', organizationId],
    queryFn: () => dashboardService.approvalsSummary(organizationId),
  });
}

export function useDashboardWorkflowsSummary(organizationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'workflows-summary', organizationId],
    queryFn: () => dashboardService.workflowsSummary(organizationId),
  });
}

export function useDashboardAlerts(organizationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'alerts', organizationId],
    queryFn: () => dashboardService.alerts(organizationId).then((response) => response.data),
  });
}

export function useDashboardWorkforceTrends(days = 30, organizationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'trends', 'workforce', days, organizationId],
    queryFn: () =>
      dashboardService
        .workforceTrends(days, organizationId)
        .then((response) => response.data),
  });
}

export function useDashboardOperationsTrends(days = 30, organizationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'trends', 'operations', days, organizationId],
    queryFn: () => dashboardService.operationsTrends(days, organizationId),
  });
}

export function useDashboardIncidentTrends(days = 30, organizationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'trends', 'incidents', days, organizationId],
    queryFn: () =>
      dashboardService
        .incidentTrends(days, organizationId)
        .then((response) => response.data),
  });
}

/**
 * @deprecated Prefer useDashboardOperatorsSummary().
 */
export function useDashboardDriversSummary(organizationId?: string) {
  return useDashboardOperatorsSummary(organizationId);
}

/**
 * @deprecated Prefer useDashboardAssetsSummary().
 */
export function useDashboardFleetSummary(organizationId?: string) {
  return useDashboardAssetsSummary(organizationId);
}

/**
 * @deprecated Prefer useDashboardOperationsSummary().
 */
export function useDashboardDispatchSummary(organizationId?: string) {
  return useDashboardOperationsSummary(organizationId);
}

/**
 * @deprecated Prefer useDashboardOperationsTrends().
 */
export function useDashboardDispatchTrends(days = 30, organizationId?: string) {
  return useDashboardOperationsTrends(days, organizationId);
}

function _isMissingTrendEndpoint(error: unknown) {
  return error instanceof ApiClientError && error.code === 'RESOURCE_NOT_FOUND';
}
